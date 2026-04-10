import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import Lesson from './pages/Lesson';
import Lessons from './pages/Lessons';
import Quiz from './pages/Quiz';
import Quizzes from './pages/Quizzes';
import Result from './pages/Result';
import Settings from './pages/Settings';
import History from './pages/History';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="documents" element={<Documents />} />
        <Route path="lessons" element={<Lessons />} />
        <Route path="lesson/:id/:chunkId?" element={<Lesson />} />
        <Route path="quizzes" element={<Quizzes />} />
        <Route path="quiz/:id" element={<Quiz />} />
        <Route path="result/:id" element={<Result />} />
        <Route path="settings" element={<Settings />} />
        <Route path="history" element={<History />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
