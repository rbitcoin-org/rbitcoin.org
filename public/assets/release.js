/* Keep release labels, assets, documentation and the Nix command on one tag. */
(() => {
  const repository = "https://github.com/rbitcoin-org/rbitcoin";
  const api = "https://api.github.com/repos/rbitcoin-org/rbitcoin/releases?per_page=100";

  function highestStableRelease(releases) {
    if (!Array.isArray(releases)) return null;
    return (
      releases
        .filter(
          (release) =>
            !release.draft && !release.prerelease && /^v\d+\.\d+\.\d+$/.test(release.tag_name)
        )
        .sort((a, b) => {
          const first = a.tag_name.slice(1).split(".").map(Number);
          const second = b.tag_name.slice(1).split(".").map(Number);
          return second[0] - first[0] || second[1] - first[1] || second[2] - first[2];
        })[0] || null
    );
  }

  function applyRelease(release) {
    const tag = encodeURIComponent(release.tag_name);
    const releaseUrl = `${repository}/releases/tag/${tag}`;
    const assets = new Set((release.assets || []).map((asset) => asset.name));
    document.querySelectorAll("[data-release-link]").forEach((link) => {
      link.href = releaseUrl;
      link.textContent = release.tag_name;
    });
    document.querySelectorAll("[data-release-asset]").forEach((link) => {
      const asset = link.dataset.releaseAsset;
      // Missing assets go to the release, rather than a fabricated download URL.
      link.href = assets.has(asset)
        ? `${repository}/releases/download/${tag}/${encodeURIComponent(asset)}`
        : releaseUrl;
    });
    // A platform row names the asset that must exist. Hide it when this release
    // does not ship that file (Linux aarch64 starts with 0.9; v0.8.0 does not).
    document.querySelectorAll("[data-release-platform]").forEach((row) => {
      row.hidden = !assets.has(row.dataset.releasePlatform);
    });
    document.querySelectorAll("[data-release-doc]").forEach((link) => {
      link.href = `${repository}/blob/${tag}/${link.dataset.releaseDoc}`;
    });
    document.querySelectorAll("[data-release-tag]").forEach((element) => {
      element.textContent = release.tag_name;
    });
    document.querySelectorAll("[data-release-fallback]").forEach((element) => {
      element.hidden = true;
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  fetch(api, {
    headers: { Accept: "application/vnd.github+json" },
    signal: controller.signal,
  })
    .then((response) => {
      if (!response.ok) throw new Error("Release information unavailable");
      return response.json();
    })
    .then(highestStableRelease)
    .then((release) => {
      if (release) applyRelease(release);
    })
    .catch(() => {
      // The committed links and manual Nix tag remain usable without the API.
    })
    .finally(() => clearTimeout(timeout));
})();
