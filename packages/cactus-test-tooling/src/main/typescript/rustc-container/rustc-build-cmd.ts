export const RustcBuildCmd = {
  CARGO_BUILD_RELEASE: ["cargo", "build", "--release"],
  WASM_PACK_BUILD_BUNDLER: [
    "wasm-pack",
    "build",
    "--release",
    "--target=bundler",
  ],
  WASM_PACK_BUILD_NODEJS: [
    "wasm-pack",
    "build",
    "--release",
    "--target=nodejs",
  ],
  WASM_PACK_BUILD_WEB: ["wasm-pack", "build", "--release", "--target=web"],
};
