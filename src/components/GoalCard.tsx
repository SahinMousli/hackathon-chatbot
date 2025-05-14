import styles from './GoalCard.module.css';

type GoalCardProps = {
  title: string;
  summary: string;
};

export default function GoalCard({ title, summary }: GoalCardProps) {
  return (
    <div className={styles.card}>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.summary}>{summary}</p>
    </div>
  );
}
