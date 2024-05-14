const { products } = require('../products.json');
const fs = require('fs');
const path = require('path');

class ProductsDataSource {
  getProducts() {
    return products;
  }

  getProduct(id) {
    return products.find(product => product.id === id);
  }

  createProduct(productInput) {
    const newProduct = {
      id: (products.length + 1).toString(),
      ...productInput,
    };
    products.push(newProduct);
    this._saveProductsToFile();
    return {
      code: 200,
      success: true,
      message: 'Product created successfully',
      product: newProduct,
    };
  }

  getFavoriteProduct(partnerId) {
    if (["1", "2", "3"].includes(partnerId)) {
      return products.filter(product => product.name === "Espresso")[0]
    } else {
      return products.filter(product => product.name === "Cold Brew")[0]
    }
  }

  getProductAvailability(id) {
    const product = this.getProduct(id);
    if (!product) return null;
    return product.stock > 0;
  }

  updateProduct(productId, updateProductInput) {
    const productIndex = products.findIndex(product => product.id === productId);
    if (productIndex === -1) {
      return {
        code: 404,
        success: false,
        message: 'Product not found',
        product: null,
      };
    }

    const updatedProduct = {
      ...products[productIndex],
      ...updateProductInput,
    };

    products[productIndex] = updatedProduct;
    this._saveProductsToFile();
    return {
      code: 200,
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct,
    };
  }

  _saveProductsToFile() {
    const filePath = path.join(__dirname, '../products.json');
    const data = JSON.stringify({ products }, null, 2);
    fs.writeFileSync(filePath, data);
  }
}

module.exports = ProductsDataSource;