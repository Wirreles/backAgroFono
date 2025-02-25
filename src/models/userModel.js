export const createUserObject = (data) => {
    return {
      id: data.id || '',
      images: data.images || [], 
      nombre: data.nombre || '', // Título del servicio
      email: data.email || '', // Categoría del servicio
      tipo_usuario: data.tipo_usuario || '',
    };
  };