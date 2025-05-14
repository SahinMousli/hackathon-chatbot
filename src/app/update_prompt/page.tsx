'use client';

import { useState, useEffect } from 'react';
import styles from './UpdatePromptPage.module.css';

export default function UpdatePromptPage() {
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    const storedPrompt = localStorage.getItem('chatbotPrompt');
    if (storedPrompt) setPrompt(storedPrompt);
  }, []);

  const handleSave = () => {
    localStorage.setItem('chatbotPrompt', prompt);
    alert('Prompt saved!');
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Update Chatbot Prompt</h1>
      <textarea
        className={styles.textarea}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter your system prompt here..."
        rows={25}
      />
      <button className={styles.button} onClick={handleSave}>
        Save Prompt
      </button>
    </div>
  );
}
