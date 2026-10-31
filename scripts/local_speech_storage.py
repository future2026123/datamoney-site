"""Upload generated public speech to the dedicated R2 bucket.

Credentials are scoped to this bucket and encrypted with Windows DPAPI for the
current account. This module never prints credentials or reads browser profiles.
"""

import argparse
import ctypes
import json
import os
from ctypes import wintypes
from pathlib import Path

BUCKET = "datamoney-article-voice"
ACCOUNT = "be57534be2be85cb30b64abced4212fa"
ENDPOINT = f"https://{ACCOUNT}.r2.cloudflarestorage.com"
PROTECTED = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "DataMoneyTTS" / "r2-credentials.dpapi"


class DataBlob(ctypes.Structure):
    _fields_ = [("cbData", wintypes.DWORD), ("pbData", ctypes.POINTER(ctypes.c_byte))]


def credentials():
    if os.name != "nt":
        raise RuntimeError("R2 credentials are protected for the Windows user who set them up")
    raw = PROTECTED.read_bytes()
    buf = ctypes.create_string_buffer(raw, len(raw))
    input_blob = DataBlob(len(raw), ctypes.cast(buf, ctypes.POINTER(ctypes.c_byte)))
    output_blob = DataBlob()
    crypt32 = ctypes.WinDLL("crypt32", use_last_error=True)
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    crypt32.CryptUnprotectData.argtypes = [
        ctypes.POINTER(DataBlob), ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p,
        ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(DataBlob),
    ]
    crypt32.CryptUnprotectData.restype = wintypes.BOOL
    kernel32.LocalFree.argtypes = [ctypes.c_void_p]
    kernel32.LocalFree.restype = ctypes.c_void_p
    if not crypt32.CryptUnprotectData(ctypes.byref(input_blob), None, None, None, None, 0, ctypes.byref(output_blob)):
        raise OSError(ctypes.get_last_error(), "Could not decrypt the R2 credentials")
    try:
        secret = ctypes.string_at(output_blob.pbData, output_blob.cbData)
        parsed = json.loads(secret.decode("utf-8-sig"))
    finally:
        kernel32.LocalFree(output_blob.pbData)
    if not parsed.get("accessKeyId") or not parsed.get("secretAccessKey"):
        raise ValueError("R2 credentials are incomplete")
    return parsed


def client():
    import boto3
    from botocore.config import Config

    auth = credentials()
    return boto3.client(
        "s3", endpoint_url=ENDPOINT, region_name="auto",
        aws_access_key_id=auth["accessKeyId"],
        aws_secret_access_key=auth["secretAccessKey"],
        config=Config(signature_version="s3v4", retries={"max_attempts": 3}),
    )


def upload(path: Path, key: str, content_type: str, cache_control: str):
    if not key.startswith("audio/") or ".." in key.split("/") or "?" in key:
        raise ValueError("Audio object key must stay below the audio/ prefix")
    with path.open("rb") as file:
        client().put_object(
            Bucket=BUCKET, Key=key, Body=file, ContentType=content_type,
            CacheControl=cache_control,
        )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--upload-test", type=Path)
    args = parser.parse_args()
    if args.check:
        result = client().list_objects_v2(Bucket=BUCKET, Prefix="audio/test/", MaxKeys=1)
        print("R2 bucket access OK; test-prefix objects:", result.get("KeyCount", 0))
    if args.upload_test:
        upload(args.upload_test, "audio/test/voice-sample-48k.mp3", "audio/mpeg", "public, max-age=3600")
        print("Uploaded the test audio to the dedicated bucket")
    if not args.check and not args.upload_test:
        parser.error("Choose --check or --upload-test")


if __name__ == "__main__":
    main()
