import { Studio } from './components/Studio';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; pay?: string }>;
}) {
  const { error, pay } = await searchParams;
  return <Studio error={error} askPay={pay === '1'} />;
}
