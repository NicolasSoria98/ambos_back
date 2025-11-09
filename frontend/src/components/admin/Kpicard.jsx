import { getChangeColor, getChangeIcon } from '../../utils/helpers';

export default function KPICard({ title, value, change, icon, color }) {
  // Determinar si el cambio es positivo o negativo
  const isPositive = change > 0;
  const changeColor = isPositive ? 'text-green-200' : 'text-red-200';
  
  // Mapeo de colores para los gradientes
  const colorClasses = {
    indigo: 'from-indigo-500 to-indigo-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    purple: 'from-purple-500 to-purple-600',
    red: 'from-red-500 to-red-600',
    blue: 'from-blue-500 to-blue-600',
  };
  
  const gradientClass = colorClasses[color] || colorClasses.indigo;

  return (
    <div className={`bg-gradient-to-br ${gradientClass} overflow-hidden shadow-lg rounded-lg hover:shadow-xl transition-shadow`}>
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="rounded-md bg-white/20 p-3">
              <i className={`${icon} text-white text-2xl`}></i>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-white/80 truncate">
                {title}
              </dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-white">
                  {value}
                </div>
                {change !== undefined && change !== null && (
                  <div className={`ml-2 flex items-baseline text-sm font-semibold ${changeColor}`}>
                    <span>{getChangeIcon(change)}</span>
                    <span className="ml-1">{Math.abs(change).toFixed(1)}%</span>
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}