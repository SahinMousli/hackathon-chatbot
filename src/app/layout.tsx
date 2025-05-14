
import Link from 'next/link';
import './globals.css'

export const metadata = {
  title: 'Chatbot UI',
  description: 'Chat and Prompt Editor',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className='container'>
        <aside className='sidebar'>
          <nav>
            <ul>
              <li><Link href="/chat">Chat</Link></li>
              <li><Link href="/update_prompt">Update Prompt</Link></li>
            </ul>
          </nav>
        </aside>
        <main className='mainContent'>{children}</main>
      </body>
    </html>
  );
}
