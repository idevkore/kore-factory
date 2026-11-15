import { facingCentre, STATION_POSITIONS, type Vec3 } from "../core/layout";
import { HOME_STAND_HEIGHT } from "./StationShapes";
import { currentTheme } from "./theme";

const TINES: ReadonlyArray<readonly [x: number, length: number]> = [
  [-0.12, 0.26],
  [0, 0.32],
  [0.12, 0.26],
];

/**
 * The figure on the home station that new sessions' carriers leave from: a
 * bearded god in a sea-green robe, standing, with a bronze trident.
 */
export function CommanderFigure() {
  const { skin, robe, beard, bronze, accent } = currentTheme.palette;
  const [x, , z] = STATION_POSITIONS.home;
  const position: Vec3 = [x, HOME_STAND_HEIGHT, z];
  return (
    <group position={position} rotation-y={facingCentre(position)} scale={1.4}>
      {[-0.1, 0.1].map((legX) => (
        <mesh key={legX} position={[legX, 0.14, 0]}>
          <cylinderGeometry args={[0.065, 0.06, 0.28, 8]} />
          <meshStandardMaterial color={skin} />
        </mesh>
      ))}
      <mesh position={[0, 0.66, 0]}>
        <cylinderGeometry args={[0.22, 0.32, 0.76, 16]} />
        <meshStandardMaterial color={robe} />
      </mesh>
      <mesh position={[0, 0.31, 0]}>
        <cylinderGeometry args={[0.322, 0.326, 0.05, 16]} />
        <meshStandardMaterial color={accent} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.2, 0.22, 0.32, 14]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      <mesh position={[0.02, 1.2, 0]} rotation-z={0.7}>
        <boxGeometry args={[0.12, 0.5, 0.46]} />
        <meshStandardMaterial color={robe} />
      </mesh>
      <mesh position={[-0.28, 1.08, 0]} rotation-z={0.12}>
        <cylinderGeometry args={[0.055, 0.06, 0.48, 8]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      <mesh position={[0.28, 1.12, 0.08]} rotation-x={-0.5}>
        <cylinderGeometry args={[0.055, 0.06, 0.44, 8]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      <mesh position={[0, 1.53, 0]}>
        <sphereGeometry args={[0.16, 16, 12]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      <mesh position={[0, 1.555, -0.015]}>
        <sphereGeometry args={[0.172, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={beard} />
      </mesh>
      <mesh position={[0, 1.36, 0.07]} rotation-x={Math.PI}>
        <coneGeometry args={[0.13, 0.26, 12]} />
        <meshStandardMaterial color={beard} />
      </mesh>
      <group position={[0.32, 0, 0.18]}>
        <mesh position={[0, 1.05, 0]}>
          <cylinderGeometry args={[0.022, 0.022, 2.1, 8]} />
          <meshStandardMaterial color={bronze} metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, 2.08, 0]}>
          <boxGeometry args={[0.26, 0.035, 0.035]} />
          <meshStandardMaterial color={bronze} metalness={0.6} roughness={0.4} />
        </mesh>
        {TINES.map(([tineX, length]) => (
          <mesh key={tineX} position={[tineX, 2.08 + length / 2, 0]}>
            <coneGeometry args={[0.022, length, 6]} />
            <meshStandardMaterial color={bronze} metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
