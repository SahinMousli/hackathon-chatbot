import styles from './Message.module.css';

type MessageProps = {
  role: 'user' | 'system' | 'assistant';
  visibleText: string;
};

export default function Message({ role, visibleText }: MessageProps) {
  const isUser = role === 'user';
  const isSystem = role === 'system';
  return (
    <>
      {!isSystem &&
        <div className={`${styles.messageRow} ${isUser ? styles.user : styles.bot}`}>
          <div className={styles.bubble}>{visibleText}</div>
        </div>
      }
    </>
  );
}
