import React from 'react';
import { G, Rect, Text as SvgText, Circle } from 'react-native-svg';

export default function VendorMarker({ x, y, category, rating, highlighted, faded, onPress }) {
  const icon = '⭐';

  return (
    <G onPress={onPress} x={x} y={y} opacity={faded ? 0.25 : 1.0}>
      <Circle r={24} fill="transparent" />
      {highlighted && (
        <>
          <Circle r={22} fill="none" stroke="#E8621A" strokeWidth={2.5} strokeDasharray="4,4" />
          <Circle r={26} fill="none" stroke="#E8621A" strokeWidth={1} opacity={0.5} />
        </>
      )}
      <Rect x={-12} y={-12} width={24} height={24} fill="#1A3557" rx={4} />
      <SvgText fontSize={10} textAnchor="middle" y={3}>
        {icon}
      </SvgText>
      <SvgText fontSize={8} textAnchor="middle" y={22} fill="#1A3557" fontWeight="bold">
        {rating ? rating.toFixed(1) : ''}
      </SvgText>
    </G>
  );
}
