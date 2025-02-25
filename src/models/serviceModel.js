export const createServiceObject = (data) => {
    return {
      id: data.id || '',
      images: data.images || [], 
      title: data.title || '', // Título del servicio
      category: data.category || '', // Categoría del servicio
      price: data.price || 0, // Precio del servicio
      description: data.description || '', // Descripción del servicio
      userId: data.userId || '',
      telefono: data.telefono || '',
    };
  };
  