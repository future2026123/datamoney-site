import subprocess
import sys
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import local_voice_runner as runner


class GeneratorWaitTests(unittest.TestCase):
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
