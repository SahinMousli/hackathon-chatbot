import styles from './Message.module.css';

type MessageProps = {
  role: 'user' | 'system' | 'assistant';
  content: string;
};

export default function Message({ role, content }: MessageProps) {
  const isUser = role === 'user';
  const isSystem = role === 'system';
  const text = JSON.parse(content).text;

  return (
    <div className={`${styles.messageRow} ${isUser ? styles.user : isSystem ? styles.system : styles.bot}`}>
      <div className={styles.bubble}>{text}</div>
    </div>
  );
}
