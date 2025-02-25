export const createProductObject = (data) => {
    return {
      id: data.id || '',
      images: data.images || [], 
      title: data.title || '', // Título del producto
      category: data.category || '', // Categoría del producto
      price: data.price || 0, // Precio del producto
      description: data.description || '', // Descripción del producto
      userId: data.userId || '',
      // variants: data.variants || [], 
      stock: data.stock || 0, // Stock disponible
      brand: data.brand || '',
      isActive: data.isActive,
      discount: data.discount || 0,
      discountPrice: data.discountPrice || 0,
    };
  };
  