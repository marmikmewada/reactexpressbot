import React, { useState } from 'react';
import './App.css';

function App() {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [state, setState] = useState('default'); // Track state
  const [menu, setMenu] = useState({});
  const [bucket, setBucket] = useState({}); // To store selected items

  const handleSendMessage = async (e) => {
    e.preventDefault();
    setChatHistory([...chatHistory, { from: 'user', text: message }]);
  
    // Check if the message includes a request for the menu
    if (message.toLowerCase().includes('menu')) {
      // Request the menu from the backend
      try {
        const response = await fetch('http://localhost:3000/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'menu' }),
        });
        const data = await response.json();
        setChatHistory((prev) => [...prev, { from: 'bot', text: data.message }]);
        setMenu(data.menu); // Set the menu received from the backend
        setState('show_menu'); // Update state to show the menu
        setMessage(''); // Clear input after requesting menu
      } catch (error) {
        console.error('Error:', error);
      }
    } else {
      // General message handling
      try {
        const response = await fetch('http://localhost:3000/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
        });
        const data = await response.json();
        setChatHistory((prev) => [...prev, { from: 'bot', text: data.message }]);
        setState(data.state); // Update state based on response
  
        if (data.state === 'show_menu') {
          setMenu(data.menu); // Set menu received from the backend
          console.log('Menu received from backend:', data.menu); // Log the menu object
          setMessage(''); // Clear input after the bot responds with menu
        }
  
        setMessage(''); // Clear input for general messages
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  const handleAddToBucket = (item) => {
    setBucket((prev) => ({
      ...prev,
      [item.name]: {
        price: item.price,
        quantity: (prev[item.name]?.quantity || 0) + 1,
      },
    }));
  };

  const handleRemoveFromBucket = (item) => {
    setBucket((prev) => {
      const newBucket = { ...prev };
      if (newBucket[item.name]?.quantity > 1) {
        newBucket[item.name].quantity -= 1;
      } else {
        delete newBucket[item.name];
      }
      return newBucket;
    });
  };

  const handleIncrement = (item) => {
    setBucket((prev) => ({
      ...prev,
      [item.name]: {
        ...prev[item.name],
        quantity: (prev[item.name]?.quantity || 0) + 1,
      },
    }));
  };

  const handleConfirmOrder = async () => {
    const orderDetails = {
      items: Object.entries(bucket).map(([name, details]) => ({
        name,
        quantity: details.quantity,
      })),
    };

    try {
      const response = await fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: orderDetails }), // Send order as an object
      });
      const data = await response.json();
      setChatHistory((prev) => [...prev, { from: 'bot', text: data.message }]);
      setState(data.state);
      setBucket({}); // Clear the bucket after confirming the order
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Food Ordering Chatbot</h1>
        <div className="chat-container">
          <div className="chat-history">
            {chatHistory.map((msg, index) => (
              <div key={index} className={msg.from}>{msg.text}</div>
            ))}
          </div>
          {state === 'show_menu' ? (
            <div>
              <h2>Menu</h2>
              {Object.entries(menu).map(([name, price]) => (
                <button key={name} onClick={() => handleAddToBucket({ name, price })}>
                  {name} (${price.toFixed(2)})
                </button>
              ))}
              <h2>Your Bucket</h2>
              {Object.entries(bucket).map(([name, details]) => (
                <div key={name}>
                  <span>{name} - ${details.price.toFixed(2)} x {details.quantity}</span>
                  <button onClick={() => handleRemoveFromBucket({ name })}>-</button>
                  <button onClick={() => handleIncrement({ name, price: details.price })}>+</button>
                </div>
              ))}
              <button onClick={handleConfirmOrder}>Confirm Items</button>
            </div>
          ) : (
            <form onSubmit={handleSendMessage}>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                required
              />
              <button type="submit">Send</button>
            </form>
          )}
        </div>
      </header>
    </div>
  );
}

export default App;
