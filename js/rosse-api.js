
const ROSSE_API = "https://api.rossetienda.online";

async function rosseRequest(path, method = "GET", data) {
  const options = {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  };

  if (data !== undefined) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(ROSSE_API + path, options);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Error de conexión");
  }

  return result;
}

const Rossé = {
  health: () => rosseRequest("/health"),

  register: (data) =>
    rosseRequest("/auth/registro", "POST", data),

  login: (correo, password) =>
    rosseRequest("/auth/login", "POST", {
      correo,
      password
    }),

  session: () =>
    rosseRequest("/auth/sesion"),

  logout: () =>
    rosseRequest("/auth/salir", "POST"),

  getMoments: () =>
    rosseRequest("/momentos"),

  addMoment: (data) =>
    rosseRequest("/momentos", "POST", data),

  updateMoment: (id, data) =>
    rosseRequest(`/momentos/${id}`, "PUT", data),

  deleteMoment: (id) =>
    rosseRequest(`/momentos/${id}`, "DELETE")
};
