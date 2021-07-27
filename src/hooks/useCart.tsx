import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const product = await api.get<Product>(`/products/${productId}`);

      const stock = await api.get<Stock>(`/stock/${productId}`);
      const stockAmount = stock.data.amount;

      
      const productIndex = cart.findIndex(
        (cartItem) => cartItem.id === productId
      );

      
      const isProductOnCart = productIndex !== -1;

      
      const currentProductAmount = isProductOnCart
        ? cart[productIndex].amount
        : 0;

      const amountUpdated = currentProductAmount + 1; 

      if (amountUpdated > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");

        return;
      }

      
      if (isProductOnCart) {
        updateProductAmount({
          productId,
          amount: amountUpdated,
        });

        return;
      }

      
      const cartUpdated = [...cart, { ...product.data, amount: 1 }];

      setCart(cartUpdated);

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cartUpdated));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productToRemove = cart.find(
        (cartItem) => cartItem.id === productId
      );

      
      if (productToRemove) {
        const filteredCart = cart.filter(
          (cartItem) => cartItem.id !== productId
        );

        localStorage.setItem("@RocketShoes:cart", JSON.stringify(filteredCart));

        setCart(filteredCart);
      } else {
        
        throw new Error();
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const productStock = await api.get<Stock>(`/stock/${productId}`);

      if (amount < 1) {
        return;
      }

      if (productStock.data.amount < amount) {
        toast.error("Quantidade solicitada fora de estoque");

        return;
      }

      
      const cartCopy = cart.slice(); 
      const productToUpdateIndex = cartCopy.findIndex(
        (cartItem) => cartItem.id === productId
      );

      cartCopy[productToUpdateIndex].amount = amount;

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cartCopy));

      setCart(cartCopy);
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
