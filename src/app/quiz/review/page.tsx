import Quiz from '@/components/Quiz';

export const metadata = {
  title: '弱点克服・復習モード | 運行管理者過去問',
};

export default function ReviewQuizPage() {
  return <Quiz mode="review" />;
}
