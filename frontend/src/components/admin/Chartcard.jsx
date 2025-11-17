import { motion } from 'framer-motion';

export default function ChartCard({ title, icon, iconColor = 'indigo', children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white shadow-lg rounded-lg p-4 sm:p-6"
    >
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
        <i className={`${icon} text-${iconColor}-500 mr-2`}></i>
        {title}
      </h3>
      {children}
    </motion.div>
  );
}