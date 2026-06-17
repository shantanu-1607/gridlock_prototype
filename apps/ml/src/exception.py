import traceback


class GridLockException(Exception):
    def __init__(self, message: str):
        frame = traceback.extract_stack(limit=2)[0]
        self.detail = f"{frame.filename}:{frame.lineno} — {message}"
        super().__init__(self.detail)
