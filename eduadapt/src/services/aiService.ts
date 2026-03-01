const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const aiService = {
  async adaptarMaterial(file: File, perfil: string = 'tdah') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('perfil', perfil);

    try {
      const response = await fetch(`${BASE_URL}/adapt/file`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Error en el servidor: ${response.statusText}`);
      }

      const data = await response.json();
      return data.resultado;

    } catch (error) {
      console.error("Error en la conexión:", error);
      throw error;
    }
  }
};