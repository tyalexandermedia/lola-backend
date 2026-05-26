"""
Anti-drift guard. Kept minimal per the pasted spec — currently records every
task to a bounded in-memory log so we can observe agent activity but doesn't
veto anything. Hook real validation here when policy is defined.
"""

from collections import deque
from datetime import datetime
from typing import Deque, Dict, List


class AntiDriftGuards:
    def __init__(self, allowed_roles: List[str], max_history: int = 500) -> None:
        self.allowed_roles = set(allowed_roles)
        self.task_history: Deque[Dict] = deque(maxlen=max_history)

    def validate_task(self, agent_id: str, role: str, task: str) -> bool:
        self.task_history.append(
            {
                "agent_id": agent_id,
                "role": role,
                "task": task[:200],
                "timestamp": datetime.utcnow().isoformat() + "Z",
            }
        )
        return role in self.allowed_roles if self.allowed_roles else True

    def recent(self, limit: int = 50) -> List[Dict]:
        return list(self.task_history)[-limit:]
