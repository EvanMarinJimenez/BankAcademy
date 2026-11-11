// Las grabaciones antiguas guardaban "http://localhost:3000/uploads/...".
// Se convierten a ruta relativa para que se pidan a través del proxy de Vite desde cualquier computadora.
export const urlGrabacion = (url) => (url || '').replace(/^https?:\/\/localhost:\d+/, '')
