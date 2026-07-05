class NotFoundError(Exception):
    """Raised by a service when a requested entity doesn't exist — translated to a 404."""


class ConflictError(Exception):
    """Raised by a service for a request that conflicts with existing state — translated to a 409."""
