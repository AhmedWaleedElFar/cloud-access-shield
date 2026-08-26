interface ErrorMessageProps {
  title: string;
  message?: string;
}

export default function ErrorMessage({ title, message }: ErrorMessageProps) {
  return (
    <div className="rounded-md bg-red-50 border border-red-200 p-4">
      <div className="flex">
        <div className="text-red-400 mr-3 text-lg">&#x26A0;</div>
        <div>
          <h3 className="text-sm font-medium text-red-800">{title}</h3>
          {message && <p className="text-sm text-red-700 mt-1">{message}</p>}
        </div>
      </div>
    </div>
  );
}
