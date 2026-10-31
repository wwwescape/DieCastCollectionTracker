#!/bin/sh
set -e

# Fix ownership at runtime, not build time — see Dockerfile for why (chown under QEMU
# cross-arch emulation doesn't reliably persist into the image, and a volume that already
# exists keeps its old ownership). Cheap and idempotent. Without it, SQLite fails with
# "unable to open database file" because appuser can't create the file in db/.
chown -R appuser:appuser db uploads

# Drop to appuser with setpriv rather than su: su stays behind as the app's parent instead
# of exec'ing it, and "exec $*" re-split any argument containing spaces.
setpriv --reuid=appuser --regid=appuser --init-groups alembic upgrade head
exec setpriv --reuid=appuser --regid=appuser --init-groups "$@"
