import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import local_voice_runner as runner


class GeneratorWaitTests(unittest.TestCase):
    def test_a_separately_managed_voice_is_never_queued_for_female_generation(self):
        self.assertTrue(runner.managed_locally({"voice": "female-v1"}))
        self.assertFalse(runner.managed_locally({"voice": "ko-KR-InJoonNeural-v1"}))

    def test_generator_refuses_to_replace_a_separately_managed_voice(self):
        root = Path(__file__).resolve().parents[1]
        article = (root / "blog" / "ai-semiconductor-per-2026" / "index.html").read_text(encoding="utf-8")
        article = article.replace("</head>", '<meta name="dm-speech-voice" content="ko-KR-InJoonNeural-v1"></head>', 1)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "blog" / "test"
            path.mkdir(parents=True)
            (path / "index.html").write_text(article, encoding="utf-8")
            result = subprocess.run([sys.executable, str(root / "scripts" / "generate_local_speech.py"),
                                     "test", "--source-root", directory, "--dry-run"],
                                    capture_output=True, text=True)
        self.assertEqual(result.returncode, 20)
        self.assertIn("separately managed voice", result.stdout)

    def test_long_article_continues_while_desktop_is_idle(self):
        process = Mock(pid=1234)
        process.wait.side_effect = [subprocess.TimeoutExpired("generator", 5), 0]
        with patch.object(runner, "idle_seconds", return_value=200), \
             patch.object(runner.subprocess, "run") as kill:
            self.assertEqual(runner.wait_for_generator(process, True), 0)
        kill.assert_not_called()
        self.assertEqual(process.wait.call_count, 2)

    def test_user_activity_stops_the_generator_tree(self):
        process = Mock(pid=1234)
        process.wait.side_effect = [subprocess.TimeoutExpired("generator", 5), 1]
        with patch.object(runner, "idle_seconds", return_value=1), \
             patch.object(runner, "log"), \
             patch.object(runner.subprocess, "run", return_value=Mock(returncode=0)) as kill:
            self.assertEqual(runner.wait_for_generator(process, True), 10)
        self.assertEqual(kill.call_args.args[0], ["taskkill", "/PID", "1234", "/T", "/F"])


if __name__ == "__main__":
    unittest.main()
