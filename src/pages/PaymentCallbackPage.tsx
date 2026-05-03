import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Card, LoadingState } from '../components/ui';
import { paymentProvider } from '../lib/payment';

export function PaymentCallbackPage() {
  const [params] = useSearchParams();
  const [message, setMessage] = useState('');

  useEffect(() => {
    const transactionId = params.get('id') || params.get('transaction_id') || '';
    if (!transactionId) {
      setMessage('بيانات الدفع غير مكتملة');
      return;
    }
    paymentProvider.verifyPayment(transactionId).then((result) => {
      setMessage(result.success ? 'تم استلام نتيجة الدفع' : (result.message || 'لم يتم تأكيد الدفع'));
    });
  }, [params]);

  if (!message) return <LoadingState label="بنراجع حالة الدفع..." />;

  return (
    <div className="grid min-h-[70vh] place-items-center">
      <Card className="max-w-md text-center">
        <h1 className="font-display text-2xl font-extrabold text-ink">{message}</h1>
        <Link to="/orders"><Button className="mt-5">عرض طلباتي</Button></Link>
      </Card>
    </div>
  );
}
