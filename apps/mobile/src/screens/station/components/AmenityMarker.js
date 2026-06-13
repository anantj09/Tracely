import React from 'react';
import { G, Circle, Text as SvgText } from 'react-native-svg';

const STATUS_COLORS = {
  WORKING: '#27AE60',
  BROKEN: '#E8621A',
  CONFIRMED_BROKEN: '#CC0000',
  UNKNOWN: '#AAAAAA'
};

const TYPE_ICONS = {
  TOILET: '🚻',
  WATER: '💧',
  FOOD_STALL: '🍽️',
  MEDICAL: '➕',
  ATM: '💳',
  CLOAK_ROOM: '🧳',
  PREPAID_AUTO: '🛺',
  WAITING_ROOM: '🪑',
  ENQUIRY: 'ℹ️',
  PLATFORM_ENTRY: '🚪'
};

export default function AmenityMarker({ x, y, type, status, highlighted, faded, onPress }) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.UNKNOWN;
  const icon = TYPE_ICONS[type] || '📍';

  return (
    <G onPress={onPress} x={x} y={y} opacity={faded ? 0.25 : 1.0}>
      <Circle r={24} fill="transparent" />
      {highlighted && (
        <>
          <Circle r={22} fill="none" stroke="#E8621A" strokeWidth={2.5} strokeDasharray="4,4" />
          <Circle r={26} fill="none" stroke="#E8621A" strokeWidth={1} opacity={0.5} />
        </>
      )}
      <Circle r={18} fill={color} opacity={0.15} />
      <Circle r={14} fill={color} />
      <SvgText fontSize={12} textAnchor="middle" y={4}>
        {icon}
      </SvgText>
    </G>
  );
}
