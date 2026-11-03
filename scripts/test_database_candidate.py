"""Fresh source/Compose checks only; no image, service or database is started."""

import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parents[1]
PREPARED = ROOT / "deploy/database"
PREFIX = "LEARNING_HUB_POSTGRES"
REQUIRE_COMPOSE = "--require-compose" in sys.argv
if REQUIRE_COMPOSE:
    sys.argv.remove("--require-compose")


def document(name):
    return json.loads((PREPARED / name).read_text())


def example(name):
    result = {}
    for line in (PREPARED / name).read_text().splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        key, separator, value = line.partition("=")
        if not separator or key in result:
            raise ValueError("Invalid or duplicate example environment key")
        result[key] = value
    return result


class CandidateBoundaries(unittest.TestCase):
    def setUp(self):
        self.database = document("compose.database.yaml")
        self.postgres = self.database["services"]["postgres"]
        self.overlay = document("compose.application-database.yaml")

    def test_database_is_a_separate_opt_in_private_project(self):
        self.assertEqual(set(self.database["services"]), {"postgres"})
        self.assertEqual(self.postgres["profiles"], ["candidate-database"])
        for key in ("ports", "network_mode", "privileged", "build"):
            self.assertNotIn(key, self.postgres)
        self.assertEqual(set(self.postgres["networks"]), {"database"})
        self.assertEqual(self.postgres["networks"]["database"]["aliases"], ["learning-hub-postgres"])
        self.assertTrue(self.database["networks"]["database"]["internal"])
        self.assertEqual(self.postgres["cap_drop"], ["ALL"])
        self.assertIn("no-new-privileges:true", self.postgres["security_opt"])

    def test_retained_storage_image_identity_and_capacity_are_explicit(self):
        volume = self.database["volumes"]["postgres_data"]
        self.assertTrue(volume["external"])
        self.assertIn(PREFIX + "_VOLUME:?", volume["name"])
        data, = [mount for mount in self.postgres["volumes"] if mount["type"] == "volume"]
        self.assertEqual(data["target"], "/var/lib/postgresql/data")
        self.assertEqual(self.postgres["environment"]["PGDATA"], data["target"] + "/pgdata")
        for key in ("image", "platform", "user", "mem_limit", "cpus", "shm_size"):
            self.assertIn(":?", self.postgres[key])
        self.assertIn(PREFIX + "_MAX_CONNECTIONS:?", " ".join(self.postgres["command"]))
        self.assertTrue(self.postgres["read_only"])
        self.assertIn("@sha256:", example("database.env.example")[PREFIX + "_IMAGE"])
        environment = self.postgres["environment"]
        self.assertEqual(environment["POSTGRES_USER"], "postgres")
        self.assertEqual(environment["POSTGRES_DB"], "postgres")
        self.assertNotIn("POSTGRES_PASSWORD", environment)
        self.assertEqual(environment["POSTGRES_PASSWORD_FILE"], "/run/secrets/postgres_bootstrap_password")
        self.assertIn(":?", self.database["secrets"]["postgres_bootstrap_password"]["file"])

    def test_tls_and_hba_reject_plaintext_and_named_admin_network_login(self):
        for item in ("ssl=on", "ssl_min_protocol_version=TLSv1.2", "password_encryption=scram-sha-256",
                     "ssl_cert_file=/run/postgres-tls/server.crt", "ssl_key_file=/run/postgres-tls/server.key",
                     "hba_file=/etc/postgresql/pg_hba.conf"):
            self.assertIn(item, self.postgres["command"])
        self.assertIn("--auth-host=scram-sha-256", self.postgres["environment"]["POSTGRES_INITDB_ARGS"])
        self.assertIn("--auth-local=peer", self.postgres["environment"]["POSTGRES_INITDB_ARGS"])
        for mount in self.postgres["volumes"]:
            if mount["type"] == "bind":
                self.assertTrue(mount["read_only"])
                self.assertFalse(mount["bind"]["create_host_path"])
        rules = [line.split() for line in (PREPARED / "postgres.pg_hba.conf").read_text().splitlines()
                 if line.strip() and not line.lstrip().startswith("#")]
        self.assertIn(["local", "all", "postgres", "peer"], rules)
        self.assertTrue(all(rule[-1] != "trust" for rule in rules))
        for subnet in ("0.0.0.0/0", "::/0"):
            self.assertIn(["hostnossl", "all", "all", subnet, "reject"], rules)
            deny = ["hostssl", "all", "postgres", subnet, "reject"]
            allow = ["hostssl", "all", "all", subnet, "scram-sha-256"]
            self.assertLess(rules.index(deny), rules.index(allow))

    def test_connection_reference_preserves_external_choice_and_verified_tls(self):
        values = example("application.env.example")
        self.assertEqual(set(values), {"DATABASE_URL"})
        parsed = urlsplit(values["DATABASE_URL"])
        self.assertEqual(parsed.scheme, "postgresql")
        self.assertEqual(parsed.hostname, "<current-or-qualified-database-host>")
        self.assertEqual(parse_qs(parsed.query), {
            "sslmode": ["verify-full"],
            "sslrootcert": ["/run/learning-hub-db-ca/root.crt"],
        })
        self.assertNotIn("SESSION_SECRET", values)
        self.assertNotIn("ALLOWED_ORIGINS", values)

    def test_overlay_only_adds_private_network_and_readable_ca(self):
        self.assertEqual(set(self.overlay["services"]), {"app"})
        app = self.overlay["services"]["app"]
        self.assertEqual(set(app), {"networks", "volumes"})
        self.assertEqual(set(app["networks"]), {"ingress", "database"})
        database = self.overlay["networks"]["database"]
        self.assertTrue(database["external"])
        self.assertEqual(database["name"], self.database["networks"]["database"]["name"])
        mount, = app["volumes"]
        self.assertEqual(mount["target"], "/run/learning-hub-db-ca/root.crt")
        self.assertIn("LEARNING_HUB_DATABASE_CA_FILE:?", mount["source"])
        self.assertTrue(mount["read_only"])
        self.assertFalse(mount["bind"]["create_host_path"])

    def test_private_material_is_ignored_and_excluded_from_application_images(self):
        private = ["private/secret", "tls/server.key", "backups/retained.dump", "database.env",
                   "compose.runtime.json", "server.crt", "source.sql.gz"]
        paths = ["deploy/database/" + name for name in private]
        result = subprocess.run(["git", "check-ignore", "--no-index", "--stdin"], cwd=ROOT,
                                input="\n".join(paths) + "\n", capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(set(result.stdout.splitlines()), set(paths))
        public = ["deploy/database/database.env.example", "deploy/database/application.env.example",
                  "deploy/database/compose.database.yaml", "deploy/database/README.md"]
        result = subprocess.run(["git", "check-ignore", "--no-index", "--stdin"], cwd=ROOT,
                                input="\n".join(public) + "\n", capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        ignore = (ROOT / ".dockerignore").read_text().splitlines()
        self.assertIn("deploy/database", ignore)
        self.assertIn("**/compose.runtime.json", ignore)


class ActualComposeRendering(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not shutil.which("docker"):
            if REQUIRE_COMPOSE:
                raise AssertionError("Docker Compose is required for this CI configuration check")
            raise unittest.SkipTest("Use --require-compose in CI to require the actual Compose renderer")

    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        root = Path(self.temporary.name)
        tls = root / "tls"
        tls.mkdir()
        for filename in ("server.crt", "server.key", "root.crt", "retained-ca.crt"):
            (tls / filename).write_text("synthetic-configuration-fixture-not-a-certificate\n")
        password = root / "bootstrap-password"
        password.write_text("synthetic-configuration-fixture-not-a-production-secret\n")
        password.chmod(0o600)
        self.env = {key: os.environ[key] for key in ("PATH", "HOME") if key in os.environ}
        self.env.update({
            "COMPOSE_DISABLE_ENV_FILE": "1",
            PREFIX + "_IMAGE": "postgres@sha256:" + "0" * 64,
            PREFIX + "_PLATFORM": "linux/amd64",
            PREFIX + "_UID": "10001",
            PREFIX + "_GID": "10001",
            PREFIX + "_MEMORY_LIMIT": "512m",
            PREFIX + "_CPU_LIMIT": "1",
            PREFIX + "_SHM_SIZE": "64m",
            PREFIX + "_MAX_CONNECTIONS": "40",
            PREFIX + "_VOLUME": "learning-hub-fixture-retained-volume",
            PREFIX + "_PASSWORD_FILE": str(password),
            PREFIX + "_TLS_DIR": str(tls),
            "LEARNING_HUB_DATABASE_CA_FILE": str(tls / "root.crt"),
            "APP_IMAGE": "example.invalid/learning-hub@sha256:" + "1" * 64,
        })
        self.retained_environment = {
            "NODE_ENV": "production", "PORT": "10000",
            "DATABASE_URL": "postgresql://fixture:synthetic@retained-primary.invalid/retained?sslmode=verify-full&sslrootcert=/run/retained-provider/root.crt",
            "SESSION_SECRET": "synthetic-retained-session-secret-" + "s" * 32,
            "ALLOWED_ORIGINS": "https://retained-frontend.invalid",
        }
        self.runtime = root / "compose.runtime.json"
        self.runtime.write_text(json.dumps({"services": {"app": {
            "environment": self.retained_environment,
            "volumes": [{"type": "bind", "source": str(tls / "retained-ca.crt"),
                         "target": "/run/retained-provider/root.crt", "read_only": True,
                         "bind": {"create_host_path": False}}],
        }}}))
        self.application_files = [ROOT / "deploy/oracle/compose.yaml", self.runtime]

    def compose(self, files, env=None):
        command = ["docker", "compose", "--env-file", os.devnull]
        for file in files:
            command += ["-f", str(file)]
        command += ["--profile", "candidate-database", "config", "--format", "json"]
        return subprocess.run(command, env=self.env if env is None else env, capture_output=True,
                              text=True, timeout=30, check=False)

    def test_database_config_renders_with_retained_storage_and_no_public_port(self):
        result = self.compose([PREPARED / "compose.database.yaml"])
        self.assertEqual(result.returncode, 0, result.stderr)
        rendered = json.loads(result.stdout)
        postgres = rendered["services"]["postgres"]
        self.assertFalse(postgres.get("ports"))
        self.assertEqual(postgres["user"], "10001:10001")
        self.assertEqual(postgres["environment"]["PGDATA"], "/var/lib/postgresql/data/pgdata")
        self.assertEqual(rendered["volumes"]["postgres_data"]["name"], "learning-hub-fixture-retained-volume")
        self.assertTrue(rendered["volumes"]["postgres_data"]["external"])
        self.assertTrue(rendered["networks"]["database"]["internal"])

    def test_each_required_database_input_fails_closed_when_missing(self):
        for key in sorted(name for name in self.env if name.startswith(PREFIX + "_")):
            env = dict(self.env)
            del env[key]
            with self.subTest(key=key):
                result = self.compose([PREPARED / "compose.database.yaml"], env)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(key, result.stderr)

    def test_actual_oracle_overlay_preserves_ingress_primary_session_and_runtime(self):
        before = self.compose(self.application_files)
        self.assertEqual(before.returncode, 0, before.stderr)
        after = self.compose([*self.application_files, PREPARED / "compose.application-database.yaml"])
        self.assertEqual(after.returncode, 0, after.stderr)
        retained, merged = json.loads(before.stdout), json.loads(after.stdout)
        original, app = retained["services"]["app"], merged["services"]["app"]
        self.assertEqual(merged["name"], retained["name"])
        self.assertEqual(set(merged["services"]), {"app"})
        unchanged = lambda value: {key: item for key, item in value.items() if key not in ("networks", "volumes")}
        self.assertEqual(unchanged(app), unchanged(original))
        self.assertEqual(app["environment"], self.retained_environment)
        self.assertEqual(set(app["networks"]), {"ingress", "database"})
        self.assertEqual(app["networks"]["ingress"], original["networks"]["ingress"])
        self.assertIn("learning-hub-api", app["networks"]["ingress"]["aliases"])
        self.assertEqual(merged["networks"]["ingress"], retained["networks"]["ingress"])
        self.assertEqual(merged["networks"]["ingress"]["name"], "learning-hub-ingress")
        self.assertTrue(merged["networks"]["database"]["external"])
        self.assertEqual(app["ports"], original["ports"])
        self.assertEqual(app["ports"][0]["host_ip"], "127.0.0.1")
        self.assertEqual(str(app["ports"][0]["published"]), "11002")
        mounts = {mount["target"]: mount for mount in app["volumes"]}
        for mount in original["volumes"]:
            self.assertEqual(mounts[mount["target"]], mount)
        self.assertEqual(set(mounts), {"/run/retained-provider/root.crt", "/run/learning-hub-db-ca/root.crt"})
        self.assertTrue(mounts["/run/learning-hub-db-ca/root.crt"]["read_only"])

    def test_overlay_requires_an_explicit_ca_file_without_changing_runtime(self):
        env = dict(self.env)
        del env["LEARNING_HUB_DATABASE_CA_FILE"]
        result = self.compose([*self.application_files, PREPARED / "compose.application-database.yaml"], env)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("LEARNING_HUB_DATABASE_CA_FILE", result.stderr)


if __name__ == "__main__":
    unittest.main()
