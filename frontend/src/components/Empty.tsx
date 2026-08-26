interface EmptyProps {
  title: string;
  description?: string;
}

export default function Empty({ title, description }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-4xl mb-3 text-gray-300">&#x2205;</div>
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      {description && <p className="text-gray-500 mt-1 text-sm">{description}</p>}
    </div>
  );
}
