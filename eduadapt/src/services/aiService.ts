export const aiService = {
  async adaptarMaterial(file: File, perfil: string = 'tdah') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('perfil', perfil); // El nuevo backend exige el perfil (tdah, dislexia, auditivo)

    try {
      const response = await fetch('http://localhost:8000/adapt/file', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Error en el servidor: ${response.statusText}`);
      }

      const data = await response.json();
      
      // El nuevo backend devuelve los datos dentro de una clave llamada 'resultado'
      // y usa nombres en español: 'resumen', 'bloques', 'glosario', 'quiz'
      return data.resultado; 

    } catch (error) {
      console.error("Error en la conexión:", error);
      throw error;
    }
  }
};