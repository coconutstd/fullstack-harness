import { redirect } from 'next/navigation';

// 루트 진입 시 로그인 화면으로 리다이렉트.
export default function HomePage() {
  redirect('/login');
}
