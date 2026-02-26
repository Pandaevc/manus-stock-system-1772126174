import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-2 text-gray-500">页面未找到</p>
      <Button className="mt-4" onClick={() => setLocation("/")}>
        返回首页
      </Button>
    </div>
  );
}
