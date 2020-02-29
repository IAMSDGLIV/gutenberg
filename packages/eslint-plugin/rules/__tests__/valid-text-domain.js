/**
 * External dependencies
 */
import { RuleTester } from 'eslint';

/**
 * Internal dependencies
 */
import rule from '../valid-text-domain';

const ruleTester = new RuleTester( {
	parserOptions: {
		ecmaVersion: 6,
	},
} );

ruleTester.run( 'valid-text-domain', rule, {
	valid: [
		{
			code: `__('Hello World')`,
			options: [ { allowDefault: true } ],
		},
		{
			code: `_x('Hello World', 'context')`,
			options: [ { allowDefault: true } ],
		},
		{
			code: `var number = ''; _n('Singular', 'Plural', number)`,
			options: [ { allowDefault: true } ],
		},
		{
			code: `var number = ''; _nx('Singular', 'Plural', number, 'context')`,
			options: [ { allowDefault: true } ],
		},
		{
			code: `__('Hello World', 'foo')`,
			options: [ { allowedTextDomains: [ 'foo' ] } ],
		},
		{
			code: `_x('Hello World', 'context', 'foo')`,
			options: [ { allowedTextDomains: [ 'foo' ] } ],
		},
		{
			code: `var number = ''; _n('Singular', 'Plural', number, 'foo')`,
			options: [ { allowedTextDomains: [ 'foo' ] } ],
		},
		{
			code: `var number = ''; _nx('Singular', 'Plural', number, 'context', 'foo')`,
			options: [ { allowedTextDomains: [ 'foo' ] } ],
		},
	],
	invalid: [
		{
			code: `__('Hello World')`,
			output: `__('Hello World', 'foo')`,
			options: [ { allowedTextDomains: [ 'foo' ] } ],
			errors: [ { messageId: 'missing' } ],
		},
		{
			code: `_x('Hello World', 'context')`,
			output: `_x('Hello World', 'context', 'foo')`,
			options: [ { allowedTextDomains: [ 'foo' ] } ],
			errors: [ { messageId: 'missing' } ],
		},
		{
			code: `var number = ''; _n('Singular', 'Plural', number)`,
			output: `var number = ''; _n('Singular', 'Plural', number, 'foo')`,
			options: [ { allowedTextDomains: [ 'foo' ] } ],
			errors: [ { messageId: 'missing' } ],
		},
		{
			code: `var number = ''; _nx('Singular', 'Plural', number, 'context')`,
			output: `var number = ''; _nx('Singular', 'Plural', number, 'context', 'foo')`,
			options: [ { allowedTextDomains: [ 'foo' ] } ],
			errors: [ { messageId: 'missing' } ],
		},
		{
			code: `__('Hello World', 'bar')`,
			output: `__('Hello World', 'foo')`,
			options: [ { allowedTextDomains: [ 'foo' ] } ],
			errors: [ { messageId: 'invalidValue' } ],
		},
		{
			code: `_x('Hello World', 'context', 'bar')`,
			output: `_x('Hello World', 'context', 'foo')`,
			options: [ { allowedTextDomains: [ 'foo' ] } ],
			errors: [ { messageId: 'invalidValue' } ],
		},
		{
			code: `var number = ''; _n('Singular', 'Plural', number, 'bar')`,
			output: `var number = ''; _n('Singular', 'Plural', number, 'foo')`,
			options: [ { allowedTextDomains: [ 'foo' ] } ],
			errors: [ { messageId: 'invalidValue' } ],
		},
		{
			code: `var number = ''; _nx('Singular', 'Plural', number, 'context', 'bar')`,
			output: `var number = ''; _nx('Singular', 'Plural', number, 'context', 'foo')`,
			options: [ { allowedTextDomains: [ 'foo' ] } ],
			errors: [ { messageId: 'invalidValue' } ],
		},
		{
			code: `var value = ''; __('Hello World', value)`,
			errors: [ { messageId: 'invalidType' } ],
		},
		{
			code: `var value = ''; _x('Hello World', 'context', value)`,
			errors: [ { messageId: 'invalidType' } ],
		},
		{
			code: `var value = ''; var number = ''; _n('Singular', 'Plural', number, value)`,
			errors: [ { messageId: 'invalidType' } ],
		},
		{
			code: `var value = ''; var number = ''; _nx('Singular', 'Plural', number, 'context', value)`,
			errors: [ { messageId: 'invalidType' } ],
		},
		{
			code: `__('Hello World', 'default')`,
			output: `__('Hello World')`,
			options: [ { allowDefault: true } ],
			errors: [ { messageId: 'unnecessaryDefault' } ],
		},
		{
			code: `_x('Hello World', 'context', 'default')`,
			output: `_x('Hello World', 'context')`,
			options: [ { allowDefault: true } ],
			errors: [ { messageId: 'unnecessaryDefault' } ],
		},
		{
			code: `var number = ''; _n('Singular', 'Plural', number, 'default')`,
			output: `var number = ''; _n('Singular', 'Plural', number)`,
			options: [ { allowDefault: true } ],
			errors: [ { messageId: 'unnecessaryDefault' } ],
		},
		{
			code: `var number = ''; _nx('Singular', 'Plural', number, 'context', 'default')`,
			output: `var number = ''; _nx('Singular', 'Plural', number, 'context')`,
			options: [ { allowDefault: true } ],
			errors: [ { messageId: 'unnecessaryDefault' } ],
		},
	],
} );
