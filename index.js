const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

let currentOrders = {}; // Store current orders for each user
const menuItems = [
  { name: 'chicken bucket', price: 10.99 },
  { name: 'fries', price: 2.99 },
  { name: 'cola', price: 1.49 },
];

// Path to the orders.json file
const ordersFilePath = path.join(__dirname, 'orders.json');

// Generate a unique user ID
const getUserId = (req) => req.headers['user-id'] || 'default-user';

// Load existing orders from orders.json
const loadOrders = () => {
  if (fs.existsSync(ordersFilePath)) {
    try {
      const data = fs.readFileSync(ordersFilePath, 'utf8');
      if (data.trim() === '') return []; // Return empty array if file is empty
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading or parsing orders.json:', error);
      return []; // Return an empty array on error
    }
  }
  return [];
};

// Save new orders to orders.json
const saveOrder = (order) => {
  if (!order || !order.items || !order.address) {
    console.error('Invalid order. Not saving:', order);
    return; // Don't save invalid orders
  }

  const orders = loadOrders();
  orders.push(order);

  try {
    fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2));
    console.log('Order saved successfully:', order);
  } catch (error) {
    console.error('Error saving order:', error);
  }
};

// Function to construct the menu object
const getMenuObject = () => {
  return menuItems.reduce((menu, item) => {
    menu[item.name] = item.price;
    return menu;
  }, {});
};

app.post('/chat', (req, res) => {
  // Log the incoming request body
  console.log('Received request:', req.body);

  const message = req.body.message ? req.body.message.toLowerCase().trim() : null; // Safely access message
  const userId = getUserId(req);
  let response = {};

  // Log the user ID
  console.log(`User ID: ${userId}`);

  // Initialize the current order for the user if it doesn't exist
  if (!currentOrders[userId]) {
    currentOrders[userId] = { state: 'default', items: {} };
    console.log(`Initialized new order for user: ${userId}`);
  }

  // Extract the user's current state
  const userOrder = currentOrders[userId];
  console.log(`Current order state for user ${userId}:`, userOrder);

  // Handle initial greeting
  if (message === 'hello' || message === 'hi' || message === 'hey') {
    response.message = "Hello! Welcome to KFC Ordering Chatbot. You can ask for the menu, place an order, or say 'checkout'. For example, try saying 'menu' or 'I want to order chicken bucket'.";
    userOrder.state = 'greeting';
  } 
  // Check for menu request
  else if (message && message.includes('menu')) {
    response.menu = getMenuObject(); // Send menu as an object
    userOrder.state = 'show_menu';
    console.log('Menu requested.');
  } 
  // Check for order request
  else if (message && message.includes('order')) {
    response.message = "What would you like to order? Please mention item names. For example, you can say 'chicken bucket and fries'.";
    userOrder.state = 'taking_order';
    console.log('Order requested.');
  } 
  // Check for checkout request
  else if (message && message.includes('checkout')) {
    response.message = `Your order summary: ${JSON.stringify(userOrder.items)}. Now, please provide your address. For example, say '123 Main St'.`;
    userOrder.state = 'waiting_for_address';
    console.log('Checkout requested.');
  } 
  // Handle order confirmation
  else if (req.body.order) {
    const orderDetails = req.body.order; // Get order details from the request
    console.log('Order confirmation received:', orderDetails);

    const itemSummaries = orderDetails.items.map(item => {
      const price = menuItems.find(menuItem => menuItem.name === item.name).price;
      return { name: item.name, price, quantity: item.quantity };
    });

    // Calculate totals
    const subtotal = itemSummaries.reduce((total, item) => total + (item.price * item.quantity), 0);
    const gst = subtotal * 0.18; // 18% GST
    const grandTotal = subtotal + gst;

    response.message = `Order confirmed: ${JSON.stringify(itemSummaries)}. \nSubtotal: $${subtotal.toFixed(2)} \nGST (18%): $${gst.toFixed(2)} \nGrand Total: $${grandTotal.toFixed(2)}. Thank you! Please write "checkout" to move further.`;

    // Keep the items to save later
    userOrder.items = itemSummaries; // Save confirmed items here
    userOrder.state = 'waiting_for_address'; // Move to waiting for address state
  } 
  // Handle checkout address input
  else if (userOrder.state === 'waiting_for_address') {
    const orderDetails = {
      items: userOrder.items, // Use items from the confirmed order
      address: message,
    };

    // Log the order details before saving
    console.log('Saving order:', orderDetails);

    saveOrder(orderDetails); // Save order to orders.json

    response.message = `Thanks! Your order will be delivered to: ${message}.`;
    userOrder.state = 'done';
    currentOrders[userId] = { state: 'default', items: {} }; // Reset order
    console.log('Order saved:', orderDetails);
  } 
  // Handle item orders with quantities
  else {
    const itemsOrdered = {};
    const regex = /(\d+)?\s*(chicken bucket|fries|cola)/g; // Regex to match item names and optional quantities

    let match;
    while ((match = regex.exec(message)) !== null) {
      const quantity = match[1] ? parseInt(match[1]) : 1; // Default quantity is 1
      const itemName = match[2];

      if (menuItems.some(item => item.name === itemName)) {
        itemsOrdered[itemName] = (itemsOrdered[itemName] || 0) + quantity;
      }
    }

    if (Object.keys(itemsOrdered).length > 0) {
      Object.entries(itemsOrdered).forEach(([item, qty]) => {
        userOrder.items[item] = (userOrder.items[item] || 0) + qty;
      });
      response.message = `You've ordered: ${JSON.stringify(userOrder.items)}. What else would you like to add or would you like to proceed to checkout?`;
      userOrder.state = 'taking_order';
      console.log('Items added to order:', userOrder.items);
    } else {
      response.message = "I didn't quite understand. You can ask for the menu, tell me your order, or say 'checkout'.";
      userOrder.state = 'default';
    }
  }

  console.log('Response sent:', response);
  res.json(response);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
