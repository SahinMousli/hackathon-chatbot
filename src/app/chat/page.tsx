'use client';

import {useCallback, useEffect, useState} from 'react';
import Message from '../../components/Message';
import styles from './ChatPage.module.css';
import GoalCard from 'src/components/GoalCard';
import {initPrompt} from "src/app/utils/initPrompt";

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
        body: JSON.stringify({history: messages})
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
                goals.push({title, focus});
            }
        }
    } catch {
        return goals;
    }

    return goals;
}

export default function ChatPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [goals, setGoals] = useState<Goal[]>([]);

    const [systemPrompt, setSystemPrompt] = useState('');

    const handleReset = useCallback(async () => {
        const msgs: ChatMessage[] = [{"role": "system", "content": systemPrompt, "visibleText": ''}];
        setMessages(msgs);
        setGoals([]);

        // Uncomment if you want the assistant to speak first.
        const messages = await callAPI(msgs);
        setMessages(messages);
    }, [systemPrompt]);

    useEffect(() => {
        const savedPrompt = localStorage.getItem('chatbotPrompt') || initPrompt;

        if (savedPrompt) setSystemPrompt(savedPrompt);

        const savedMessages = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedMessages) setMessages(JSON.parse(savedMessages));
        // handleReset().catch(console.error);
    }, []);

    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages));
    }, [messages]);

    async function callAPI(messages: ChatMessage[]) {
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
        return result;
    }

    const handleSend = useCallback(async () => {
        if (!input.trim()) return;

        const userMessage: ChatMessage = {role: 'user', content: input, visibleText: input};
        const newMessages = [...messages, userMessage];

        setMessages(newMessages);

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
    }, [input, messages, goals]);

    return (
        <div className={styles.chatContainer}>
            <div className={styles.messagesWindow}>
                {messages.map((msg, i) => (
                    <Message key={i} role={msg.role} visibleText={msg.visibleText || msg.content}/>
                ))}
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
                <button onClick={handleReset}>Reset</button>
            </div>

            <div className={styles.goalsSection}>
                <h2>Your Study Goals</h2>
                <div>
                    {goals.map((goal, i) => (
                        <GoalCard key={i} title={goal.title} summary={goal.focus}></GoalCard>
                    ))}
                </div>
                {/*<GoalCard*/}
                {/*    title="Finish Chapter 5 - Biology"*/}
                {/*    summary="Review key concepts like DNA replication and complete textbook exercises."*/}
                {/*/>*/}
                {/*<GoalCard*/}
                {/*    title="Practice Calculus Problems"*/}
                {/*    summary="Solve at least 10 integration problems from the worksheet."*/}
                {/*/>*/}
            </div>
        </div>


    );
}
