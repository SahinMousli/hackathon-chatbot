'use client';
import { useRef, useCallback, useEffect, useState } from 'react';
import Message from '../../components/Message';
import styles from './ChatPage.module.css';
// import GoalCard from 'src/components/GoalCard';
import { initPrompt } from "src/app/utils/initPrompt";
import Spinner from "src/components/Spinner";
import Table from 'src/components/Table';

type ChatMessage = {
    role: 'user' | 'assistant' | 'system';
    content: string;
    visibleText?: string;
};

type Goal = {
    title: string;
    focus: string;
};

const LOCAL_STORAGE_KEY = 'chatMessages';

async function postLLM(messages: { role: string; content: string }[]) {

    const response = await fetch('/api/llm', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ history: messages })
    });
    if (!response.ok) {
        throw new Error('Failed to fetch from LLM API');
    }
    return response.json();
}

function extractGoals(result: ChatMessage): Goal[] {
    const goals = [];

    try {
        const content = JSON.parse(result.content);
        if (content['goals']) {
            for (const goal of content['goals']) {
                const title = goal['goal'].trim();
                const focus = goal['focus'].trim();
                goals.push({ title, focus });
            }
        }
    } catch {
        return goals;
    }

    return goals;
}

export default function ChatPage() {
    const endRef = useRef<HTMLDivElement>(null);
    const loadingRef = useRef<boolean>(true);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [goals, setGoals] = useState<Goal[]>([]);

    const [systemPrompt, setSystemPrompt] = useState('');

    useEffect(() => {
        const savedPrompt = localStorage.getItem('chatbotPrompt') || initPrompt;

        if (savedPrompt) setSystemPrompt(savedPrompt);

        const savedMessages = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedMessages) setMessages(JSON.parse(savedMessages));
    }, []);

    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages));
    }, [messages]);

    const callAPI = useCallback(async (messages: ChatMessage[]) => {
        loadingRef.current = true;
        const result = await postLLM(messages);

        const lastMsg = result[result.length - 1];
        const newGoals = extractGoals(lastMsg);
        if (!!newGoals && newGoals.length > 0) {
            setGoals([...goals, ...newGoals]);
        }

        try {
            lastMsg.visibleText = JSON.parse(lastMsg.content).text;
        } catch {
            lastMsg.visibleText = lastMsg.content;
        }
        loadingRef.current = false;
        return result;
    }, [goals, loadingRef]);


    const handleReset = useCallback(async () => {
        const msgs: ChatMessage[] = [{ "role": "system", "content": systemPrompt, "visibleText": '' }];
        setMessages(msgs);
        setGoals([]);

        // Uncomment if you want the assistant to speak first.
        const messages = await callAPI(msgs);
        setMessages(messages);
    }, [systemPrompt, callAPI]);


    const handleSend = useCallback(async () => {
        if (!input.trim()) return;

        const userMessage: ChatMessage = { role: 'user', content: input, visibleText: input };
        const newMessages = [...messages, userMessage];

        setMessages(newMessages);
        setInput("");

        if (messages.length === 0) {
            return
        }

        try {
            const result = await callAPI(newMessages);
            console.log('\n\n', result)
            setMessages(result);
        } catch (err) {
            console.error(err);
        }
    }, [callAPI, input, messages]);


    useEffect(() => {
        if (endRef.current) {
            endRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    return (
        <div className={styles.chatContainer}>
            <div className={styles.messagesWindow}>
                {messages.map((msg, i) => (
                    <Message key={i} role={msg.role} visibleText={msg.visibleText || msg.content} />
                ))}
                {loadingRef.current && <Spinner />}
                <div id={'endBlock'} ref={endRef} style={{ height: 0, visibility: 'hidden' }} />
            </div>

            <div className={styles.inputRow}>
                <input
                    type="text"
                    placeholder="Type a message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button onClick={handleSend}>Send</button>
                <button onClick={handleReset}>Start again</button>
            </div>

            <div style={{width:600}}>
                <Table
                    data={[
                        { practice_activities: 'Write a blog post', relevance: 'High', effort: 'Medium' },
                        { practice_activities: 'Review flashcards', relevance: 'Medium', effort: 'Low' },
                    ]}
                    columns={[
                        { key: 'practice_activities', label: 'Practice Activities', sortable: true },
                        { key: 'relevance', label: 'Relevance' },
                        { key: 'effort', label: 'Effort' },
                    ]}
                    />
            </div>

            {/* <div className={styles.goalsSection}>
                <h2>Your Study Goals</h2>
                <div>
                    {goals.map((goal, i) => (
                        <GoalCard key={i} title={goal.title} summary={goal.focus}></GoalCard>
                    ))}
                </div>
            </div> */}
        </div>

    );
}
