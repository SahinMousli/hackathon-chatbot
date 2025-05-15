import styles from './Spinner.module.css';


export default function Spinner({visible = true} :{visible?:boolean}) {
    return (
        <div className={styles.cover} style={{visibility: visible ? 'visible' : 'hidden'}}>
            <span className={styles.loader}></span>
        </div>
    )
}

