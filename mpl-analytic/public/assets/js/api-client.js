
(function () {
  "use strict";

  const API_BASE_URL =
    "http://menpro.test/manajemen-proyek-kelompok-4/mpl-analytic/public/api";

  async function request(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

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
