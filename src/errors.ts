/**
 * Error indicating not support for something.
 */
export class UnsupportedError extends Error
{
	constructor(message: string)
	{
		super(message);
		this.name = this.constructor.name
	}
}

/**
 * Error produced when calling a method in an invalid state.
 */
export class InvalidStateError extends Error
{
	constructor(message: string)
	{
		super(message);
		this.name = this.constructor.name
	}
}
