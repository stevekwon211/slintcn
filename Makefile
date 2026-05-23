.PHONY: verify test build clippy clean snapshot snapshot-previews

# Single command for local pre-commit hygiene.
verify: test build clippy

test:
	npm test

build:
	cd examples/showcase && cargo build --quiet

clippy:
	cd examples/showcase && cargo clippy --quiet -- -D warnings

# Headless render the showcase to docs/img/snapshots/ via Slint's
# SoftwareRenderer (no display server required).
snapshot:
	cd examples/showcase && cargo run --quiet --features snapshot --bin snapshot

# Per-component PNGs via PreviewHost — one per registry item (UI + block).
snapshot-previews:
	cd examples/showcase && cargo run --quiet --features snapshot --bin snapshot -- --previews

clean:
	cd examples/showcase && cargo clean
	rm -rf examples/showcase/ui/slintcn
