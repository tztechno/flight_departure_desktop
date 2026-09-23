"""
Itami Airport Runway 32L Departure & Itami Curve Trajectory Generator
Extracted and enhanced from the notebook logic.
Works with standard Python libraries (math) and optional numpy.
"""

import math


class ItamiTrajectory:
    def __init__(
        self,
        speed=80.0,
        fps=6,
        hdg_rwy_deg=315.5,
        liftoff_dist=1300.0,
        d1_total=3000.0,
        climb_ang_deg=8.0,
        r_turn=1000.0,
        turn_arc_deg=90.0,
        hdg_depart_deg=230.0,
        cruise_climb_deg=6.0,
        d3=5000.0,
    ):
        self.speed = speed
        self.fps = fps
        self.hdg_rwy_deg = hdg_rwy_deg
        self.liftoff_dist = liftoff_dist
        self.d1_total = d1_total
        self.climb_ang_deg = climb_ang_deg
        self.r_turn = r_turn
        self.turn_arc_deg = turn_arc_deg
        self.hdg_depart_deg = hdg_depart_deg
        self.cruise_climb_deg = cruise_climb_deg
        self.d3 = d3

        self.compute()

    def compute(self):
        hdg_rwy_rad = math.radians(self.hdg_rwy_deg)
        rwy_dir = (math.sin(hdg_rwy_rad), math.cos(hdg_rwy_rad))
        left_perp = (-math.cos(hdg_rwy_rad), math.sin(hdg_rwy_rad))

        climb_tan = math.tan(math.radians(self.climb_ang_deg))
        turn_arc_rad = math.radians(self.turn_arc_deg)

        # End points of phases
        ph1_end_xy = (rwy_dir[0] * self.d1_total, rwy_dir[1] * self.d1_total)
        z_ph1_end = max(0.0, (self.d1_total - self.liftoff_dist) * climb_tan)
        self.ph1_end = (ph1_end_xy[0], ph1_end_xy[1], z_ph1_end)

        turn_c_xy = (
            ph1_end_xy[0] + left_perp[0] * self.r_turn,
            ph1_end_xy[1] + left_perp[1] * self.r_turn
        )
        self.turn_c_xy = turn_c_xy

        angle_start = math.atan2(
            ph1_end_xy[1] - turn_c_xy[1],
            ph1_end_xy[0] - turn_c_xy[0]
        )
        angle_end = angle_start + turn_arc_rad

        ph2_end_xy = (
            turn_c_xy[0] + self.r_turn * math.cos(angle_end),
            turn_c_xy[1] + self.r_turn * math.sin(angle_end)
        )
        arc_len = turn_arc_rad * self.r_turn
        z_ph2_end = z_ph1_end + arc_len * climb_tan
        self.ph2_end = (ph2_end_xy[0], ph2_end_xy[1], z_ph2_end)

        hdg_depart_rad = math.radians(self.hdg_depart_deg)
        depart_dir = (math.sin(hdg_depart_rad), math.cos(hdg_depart_rad))
        ph3_end_xy = (
            ph2_end_xy[0] + depart_dir[0] * self.d3,
            ph2_end_xy[1] + depart_dir[1] * self.d3
        )
        cruise_tan = math.tan(math.radians(self.cruise_climb_deg))
        z_ph3_end = z_ph2_end + self.d3 * cruise_tan
        self.ph3_end = (ph3_end_xy[0], ph3_end_xy[1], z_ph3_end)

        # Step calculation
        dt = 1.0 / self.fps
        ds = self.speed * dt

        self.n1 = max(2, int(math.ceil(self.d1_total / ds)))
        self.n2 = max(2, int(math.ceil(arc_len / ds)))
        self.n3 = max(2, int(math.ceil(self.d3 / ds)))

        # Build waypoints
        positions = []
        phases = []

        # Phase 1: Ground roll + straight climb
        for i in range(self.n1):
            t = i / (self.n1 - 1)
            dist = t * self.d1_total
            xy = (rwy_dir[0] * dist, rwy_dir[1] * dist)
            z = 0.0 if dist < self.liftoff_dist else (dist - self.liftoff_dist) * climb_tan
            positions.append((xy[0], xy[1], z))
            phases.append(1)

        # Phase 2: Itami Curve 90° CCW turn
        for i in range(self.n2):
            t = i / (self.n2 - 1)
            theta = t * turn_arc_rad
            angle = angle_start + theta
            x = turn_c_xy[0] + self.r_turn * math.cos(angle)
            y = turn_c_xy[1] + self.r_turn * math.sin(angle)
            z = z_ph1_end + t * (z_ph2_end - z_ph1_end)
            positions.append((x, y, z))
            phases.append(2)

        # Phase 3: Departure toward Kobe
        for i in range(1, self.n3):
            t = i / (self.n3 - 1)
            x = ph2_end_xy[0] + t * (ph3_end_xy[0] - ph2_end_xy[0])
            y = ph2_end_xy[1] + t * (ph3_end_xy[1] - ph2_end_xy[1])
            z = z_ph2_end + t * (z_ph3_end - z_ph2_end)
            positions.append((x, y, z))
            phases.append(3)

        self.positions = positions
        self.phases = phases

        # Direction vectors
        traj = []
        for i in range(len(positions)):
            if i < len(positions) - 1:
                fwd = (
                    positions[i + 1][0] - positions[i][0],
                    positions[i + 1][1] - positions[i][1],
                    positions[i + 1][2] - positions[i][2],
                )
            else:
                fwd = (
                    positions[-1][0] - positions[-2][0],
                    positions[-1][1] - positions[-2][1],
                    positions[-1][2] - positions[-2][2],
                )
            norm = math.sqrt(fwd[0]**2 + fwd[1]**2 + fwd[2]**2)
            unit_fwd = (fwd[0] / norm, fwd[1] / norm, fwd[2] / norm) if norm > 1e-9 else (0.0, 1.0, 0.0)
            traj.append((positions[i], unit_fwd))

        self.trajectory = traj
        return self


if __name__ == "__main__":
    sim = ItamiTrajectory()
    print("=== Itami 32L Trajectory Summary ===")
    print(f"Total Frames : {len(sim.trajectory)} ({len(sim.trajectory)/sim.fps:.1f} s)")
    print(f"Phase 1 End  : ({sim.ph1_end[0]:.1f}, {sim.ph1_end[1]:.1f}, {sim.ph1_end[2]:.1f}) m")
    print(f"Turn Center  : ({sim.turn_c_xy[0]:.1f}, {sim.turn_c_xy[1]:.1f}) m")
    print(f"Phase 2 End  : ({sim.ph2_end[0]:.1f}, {sim.ph2_end[1]:.1f}, {sim.ph2_end[2]:.1f}) m")
    print(f"Phase 3 End  : ({sim.ph3_end[0]:.1f}, {sim.ph3_end[1]:.1f}, {sim.ph3_end[2]:.1f}) m")
    print("Trajectory generation successful!")
