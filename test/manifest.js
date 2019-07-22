'use strict';

const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const Joi = require('..');


const internals = {};


const { describe, it } = exports.lab = Lab.script();
const { expect } = Code;


describe('Manifest', () => {

    describe('describe()', () => {

        it('describes schema (direct)', () => {

            const defaultFn = function () {

                return 'test';
            };

            defaultFn.description = 'testing';

            const defaultDescribedFn = function () {

                return 'test';
            };

            const defaultRef = Joi.ref('xor');

            const schema = Joi.object({
                sub: {
                    email: Joi.string().email(),
                    domain: Joi.string().domain(),
                    date: Joi.date(),
                    child: Joi.object({
                        alphanum: Joi.string().alphanum()
                    })
                },
                min: [Joi.number(), Joi.string().min(3)],
                max: Joi.string().max(3).default(0).failover(1),
                required: Joi.string().required(),
                xor: Joi.string(),
                renamed: Joi.string().valid('456'),
                notEmpty: Joi.string().required().description('a').notes('b').tags('c'),
                empty: Joi.string().empty('').strip(),
                defaultRef: Joi.string().default(defaultRef),
                defaultFn: Joi.string().default(defaultFn),
                defaultDescribedFn: Joi.string().default(defaultDescribedFn)
            })
                .prefs({ abortEarly: false, convert: false })
                .rename('renamed', 'required')
                .without('required', 'xor')
                .without('xor', 'required')
                .allow({ a: 'x' });

            const result = {
                type: 'object',
                allow: [{ value: { a: 'x' } }],
                children: {
                    sub: {
                        type: 'object',
                        children: {
                            email: {
                                type: 'string',
                                rules: [{ name: 'email' }]
                            },
                            domain: {
                                type: 'string',
                                rules: [{ name: 'domain' }]
                            },
                            date: {
                                type: 'date'
                            },
                            child: {
                                type: 'object',
                                children: {
                                    alphanum: {
                                        type: 'string',
                                        rules: [{ name: 'alphanum' }]
                                    }
                                }
                            }
                        }
                    },
                    min: {
                        type: 'alternatives',
                        matches: [
                            {
                                schema: {
                                    type: 'number'
                                }
                            },
                            {
                                schema: {
                                    type: 'string',
                                    rules: [{ name: 'min', args: { limit: 3 } }]
                                }
                            }
                        ]
                    },
                    max: {
                        type: 'string',
                        flags: {
                            default: 0,
                            failover: 1
                        },
                        rules: [{ name: 'max', args: { limit: 3 } }]
                    },
                    required: {
                        type: 'string',
                        flags: {
                            presence: 'required'
                        }
                    },
                    xor: {
                        type: 'string'
                    },
                    renamed: {
                        type: 'string',
                        flags: {
                            only: true
                        },
                        allow: ['456']
                    },
                    notEmpty: {
                        type: 'string',
                        flags: {
                            description: 'a',
                            presence: 'required'
                        },
                        notes: ['b'],
                        tags: ['c']
                    },
                    empty: {
                        type: 'string',
                        flags: {
                            empty: {
                                type: 'string',
                                flags: {
                                    only: true
                                },
                                allow: ['']
                            },
                            strip: true
                        }
                    },
                    defaultRef: {
                        type: 'string',
                        flags: {
                            default: {
                                ref: { path: ['xor'] }
                            }
                        }
                    },
                    defaultFn: {
                        type: 'string',
                        flags: {
                            default: defaultFn
                        }
                    },
                    defaultDescribedFn: {
                        type: 'string',
                        flags: {
                            default: defaultDescribedFn
                        }
                    }
                },
                dependencies: [
                    {
                        type: 'without',
                        key: 'required',
                        peers: ['xor']
                    },
                    {
                        type: 'without',
                        key: 'xor',
                        peers: ['required']
                    }
                ],
                renames: [
                    {
                        from: 'renamed',
                        to: 'required',
                        options: {
                            alias: false,
                            multiple: false,
                            override: false
                        }
                    }
                ],
                preferences: {
                    abortEarly: false,
                    convert: false
                }
            };

            const description = schema.describe();
            expect(description).to.equal(result);
            expect(description.children.defaultRef.flags.default).to.equal({ ref: { path: ['xor'] } });
        });

        it('describes schema (any)', () => {

            const any = Joi;
            const description = any.describe();
            expect(description).to.equal({
                type: 'any'
            });
        });

        it('describes schema without invalids', () => {

            const description = Joi.allow(null).describe();
            expect(description.invalids).to.not.exist();
        });

        it('describes value map', () => {

            const symbols = [Symbol(1), Symbol(2)];
            const map = new Map([[1, symbols[0]], ['two', symbols[1]]]);
            const schema = Joi.symbol().map(map).describe();
            expect(schema).to.equal({
                type: 'symbol',
                flags: {
                    only: true
                },
                map: [...map.entries()],
                allow: symbols
            });
        });

        it('describes symbol without map', () => {

            const symbols = [Symbol(1), Symbol(2)];
            const schema = Joi.symbol().valid(...symbols).describe();
            expect(schema).to.equal({
                type: 'symbol',
                flags: {
                    only: true
                },
                allow: symbols
            });
        });

        it('handles empty values', () => {

            expect(Joi.allow(1).invalid(1).describe()).to.equal({ type: 'any', invalid: [1] });
            expect(Joi.invalid(1).allow(1).describe()).to.equal({ type: 'any', allow: [1] });
        });

        it('describes ruleset changes', () => {

            const schema = Joi.string().min(1).keep();
            expect(schema.describe()).to.equal({
                type: 'string',
                rules: [
                    {
                        name: 'min',
                        keep: true,
                        args: { limit: 1 }
                    }
                ]
            });
        });
    });

    describe('build()', () => {

        it('builds basic schemas', () => {

            internals.test([
                Joi.any(),
                Joi.array(),
                Joi.binary(),
                Joi.boolean(),
                Joi.date(),
                Joi.func(),
                Joi.number(),
                Joi.string(),
                Joi.symbol()
            ]);
        });

        it('sets flags', () => {

            internals.test([
                Joi.string().required(),
                Joi.func().default(() => null, { literal: true }),
                Joi.object().default()
            ]);
        });

        it('sets preferences', () => {

            internals.test([
                Joi.object().prefs({ abortEarly: true }),
                Joi.string().min(10).prefs({ messages: { 'string.min': Joi.x('{$x}') } }),
                Joi.string().min(10).prefs({ messages: { 'string.min': Joi.x('{@x}', { prefix: { context: '@' } }) } })
            ]);
        });

        it('sets allow and invalid', () => {

            internals.test([
                Joi.string().allow(1, 2, 3),
                Joi.string().valid(Joi.ref('$x')),
                Joi.number().invalid(1),
                Joi.object().allow({ x: 1 })
            ]);
        });

        it('sets rules', () => {

            internals.test([
                Joi.string().lowercase(),
                Joi.string().alphanum(),
                Joi.string().min(10),
                Joi.string().length(10, 'binary')
            ]);
        });

        it('sets ruleset options', () => {

            internals.test([
                Joi.string().min(1).keep(),
                Joi.string().$.min(1).max(2).rule({ message: 'override' }),
                Joi.string().$.min(1).max(2).rule({ message: Joi.x('{$x}') })
            ]);
        });
    });
});


internals.test = function (schemas) {

    for (const schema of schemas) {
        const built = Joi.build(schema.describe());
        expect(built).to.equal(schema);
    }
};
