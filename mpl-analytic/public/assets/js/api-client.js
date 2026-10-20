
(function () {
  "use strict";

  const API_BASE_URL =
    "/manajemen-proyek-kelompok-4/mpl-analytic/public/api";

  async function request(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      throw new Error(
        `Respons API bukan JSON (HTTP ${response.status}). Periksa endpoint atau error PHP.`
      );
    }

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || `HTTP ${response.status}`
      );
    }

    if (result.success === false) {
      throw new Error(result.message || "API request gagal");
    }

    return result.data;
  }

  async function getDashboard() {
    return request("/dashboard");
  }

  window.ApiClient = {
    getDashboard,
  };
})();
