#!/bin/sh
set -e

# Fix ownership at runtime, not build time — see Dockerfile for why (chown under QEMU
# cross-arch emulation doesn't reliably persist into the image, and a volume that already
# exists keeps its old ownership). Cheap and idempotent. Without it, SQLite fails with
# "unable to open database file" because appuser can't create the file in db/.
chown -R appuser:appuser db uploads

su -s /bin/sh appuser -c "alembic upgrade head"
exec su -s /bin/sh appuser -c "exec $*"
