const API_URL = 'http://localhost:3000/api/products';

export class ApiError extends Error {
  constructor(message, status, details = []) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request(url, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. ¿Está encendido el backend?', 0);
  }

  if (response.status === 204) return null; // DELETE no devuelve cuerpo

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(data?.message || 'Error inesperado', response.status, data?.errors || []);
  }
  return data;
}

export const productsApi = {
  getAll: () => request(API_URL),
  getById: (id) => request(`${API_URL}/${id}`),
  create: (product) => request(API_URL, { method: 'POST', body: JSON.stringify(product) }),
  update: (id, product) => request(`${API_URL}/${id}`, { method: 'PUT', body: JSON.stringify(product) }),
  remove: (id) => request(`${API_URL}/${id}`, { method: 'DELETE' }),
};