import React from 'react';
import { Dimensions, ScrollView } from 'react-native';
import Svg, { Rect, Text as SvgText, G } from 'react-native-svg';
import AmenityMarker from './AmenityMarker';
import VendorMarker from './VendorMarker';

const SCHEMATIC_WIDTH = 1000;
const SCHEMATIC_HEIGHT = 600;
const deviceWidth = Dimensions.get('window').width - 32;
const scale = deviceWidth / SCHEMATIC_WIDTH;
const svgHeight = SCHEMATIC_HEIGHT * scale;

function resolveOverlaps(markers) {
  const resolved = [];
  for (let i = 0; i < markers.length; i++) {
    const m = { ...markers[i] };
    for (let j = 0; j < resolved.length; j++) {
      const rm = resolved[j];
      const dx = m.schematic_x - rm.schematic_x;
      const dy = m.schematic_y - rm.schematic_y;
      if (Math.sqrt(dx * dx + dy * dy) < 20) {
        m.schematic_x += 15;
      }
    }
    resolved.push(m);
  }
  return resolved;
}

const matchesAmenityType = (marker, selectedType) => {
  if (!selectedType) return true;
  if (!marker._isVendor) {
    return marker.amenity_type === selectedType;
  } else {
    if (selectedType === 'FOOD_STALL') {
      return ['FOOD', 'BEVERAGES', 'SNACKS'].includes(marker.category);
    }
    if (selectedType === 'MEDICAL') {
      return marker.category === 'PHARMACY';
    }
    return false;
  }
};

export default function SchematicMap({ stationData, amenities, vendors, onSelectAmenity, onSelectVendor, selectedAmenityType }) {
  const safeStationData = stationData || {};
  const platforms = safeStationData.platforms || [];
  const concourse = safeStationData.concourse || null;
  const entry_gates = safeStationData.entry_gates || [];
  const landmarks = safeStationData.landmarks || [];

  const safeAmenities = amenities || [];
  const safeVendors = vendors || [];

  let allMarkers = [
    ...safeAmenities.map(a => ({ ...a, _isVendor: false })),
    ...safeVendors.map(v => ({ ...v, _isVendor: true }))
  ];

  allMarkers = resolveOverlaps(allMarkers);

  const resolvedAmenities = allMarkers.filter(m => !m._isVendor);
  const resolvedVendors = allMarkers.filter(m => m._isVendor);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Svg width={deviceWidth} height={svgHeight}>
          {/* Background */}
          <Rect x={0} y={0} width={deviceWidth} height={svgHeight} fill="#F0EDE8" />

          {/* Concourse */}
          {concourse && (
            <G key="concourse">
              <Rect x={concourse.x * scale} y={concourse.y * scale}
                    width={concourse.width * scale} height={concourse.height * scale}
                    fill={concourse.fill || '#E8E0D0'} stroke="#AAA" strokeWidth={1} rx={2} />
              <SvgText x={(concourse.x + concourse.width / 2) * scale}
                       y={(concourse.y + concourse.height / 2 + 5) * scale}
                       fontSize={12 * scale} fill="#666"
                       textAnchor="middle" fontWeight="bold">
                {concourse.label}
              </SvgText>
            </G>
          )}

          {/* Entry Gates */}
          {entry_gates.map((g, idx) => (
            <G key={`entry-${g.id || idx}`}>
              <Rect x={(g.x - 60) * scale} y={(g.y - 15) * scale}
                    width={120 * scale} height={30 * scale}
                    fill="#D4EDDA" stroke="#28A745" strokeWidth={1} rx={4} />
              <SvgText x={g.x * scale} y={(g.y + 5) * scale}
                       fontSize={10 * scale} fill="#155724"
                       textAnchor="middle" fontWeight="600">
                {g.label}
              </SvgText>
            </G>
          ))}

          {/* Landmarks */}
          {landmarks.map((l, idx) => (
            <G key={`landmark-${l.id || idx}`}>
              <Rect x={(l.x - 60) * scale} y={(l.y - 15) * scale}
                    width={120 * scale} height={30 * scale}
                    fill="#E8F4FD" stroke="#007BFF" strokeWidth={1} rx={4} />
              <SvgText x={l.x * scale} y={(l.y + 5) * scale}
                       fontSize={10 * scale} fill="#17A2B8"
                       textAnchor="middle" fontWeight="500">
                {l.icon ? `${l.icon} ${l.label}` : l.label}
              </SvgText>
            </G>
          ))}

          {/* Platforms */}
          {platforms.map((p, idx) => (
            <G key={`plat-${p.number || idx}`}>
              <Rect x={p.x * scale} y={p.y * scale}
                    width={p.width * scale} height={p.height * scale}
                    fill="#D8D8D8" stroke="#999" strokeWidth={1} rx={2} />
              <SvgText x={(p.x + 30) * scale} y={(p.y + p.height / 2 + 5) * scale}
                       fontSize={11 * scale} fill="#444" fontWeight="600">
                {p.label}
              </SvgText>
            </G>
          ))}

          {/* Amenity Markers */}
          {resolvedAmenities.map(a => {
            const isHighlighted = selectedAmenityType ? a.amenity_type === selectedAmenityType : false;
            const isFaded = selectedAmenityType ? !isHighlighted : false;
            return (
              <AmenityMarker key={`am-${a.id}`}
                x={a.schematic_x * scale} y={a.schematic_y * scale}
                type={a.amenity_type} status={a.current_status}
                highlighted={isHighlighted}
                faded={isFaded}
                onPress={() => onSelectAmenity && onSelectAmenity(a)} />
            );
          })}

          {/* Vendor Markers */}
          {resolvedVendors.map(v => {
            const isHighlighted = selectedAmenityType ? matchesAmenityType(v, selectedAmenityType) : false;
            const isFaded = selectedAmenityType ? !isHighlighted : false;
            return (
              <VendorMarker key={`ven-${v.id}`}
                x={v.schematic_x * scale} y={v.schematic_y * scale}
                category={v.category} rating={v.average_rating}
                highlighted={isHighlighted}
                faded={isFaded}
                onPress={() => onSelectVendor && onSelectVendor(v)} />
            );
          })}
        </Svg>
      </ScrollView>
    </ScrollView>
  );
}
