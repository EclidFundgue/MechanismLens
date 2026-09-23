# OA-WAM selected manuscript evidence

Source: `neurips_2026.tex` from the local OA-WAM NeurIPS 2026 manuscript. This
file preserves only the passages needed by the example; it is not a replacement
for the complete paper and does not assert a public URL or acceptance status.

## Abstract — problem and proposed constraint (`neurips_2026.tex:79-80`)

The manuscript formulates the failure as a lack of object addressability. It
states that each slot concatenates an identity vector `addr_k` and a
time-varying content vector, and that cross-slot attention is routed on `addr`
alone through an addr-only key projection plus a per-layer reset of the addr
slice. It describes the aim as separating “which object to act on” from “what
that object currently is.”

## Slot construction (`neurips_2026.tex:317-322`, Eq. `slot`)

```tex
\mathbf{s}_k^t =
[\underbrace{\mathbf{addr}_k}_{32}\Vert
 \underbrace{\mathbf{cnt}_k^t}_{256}\Vert
 \underbrace{\boldsymbol{\pi}^t}_{16}\Vert
 \underbrace{\boldsymbol{\rho}_k}_{16}]
\in \mathbb{R}^{320}.
```

The manuscript says `addr_k` is computed once at `t=0` from the language label
and initial DINOv3 feature and remains fixed throughout the episode. It says
`cnt_k^t` is recomputed every frame from the current raw slot observation.

## Action query readout (`neurips_2026.tex:322`, `349-359`)

The sequence ends with a learnable `[ACT_Q]` token whose final hidden state is
read by the action head. The action head does not directly consume an
address-only tensor; it consumes `H_[ACT_Q]` after the transformer trunk.

## Slot Q/K/V rule (`neurips_2026.tex:335-344`, Eq. `oa`)

```tex
\mathbf{K}_k^{(\ell)} = W_K^{(\ell)}
  \mathrm{mask}_{\le 32}(\mathbf{x}_k^{(\ell)}),
\qquad
\mathbf{Q}_k^{(\ell)} = W_Q^{(\ell)}\mathbf{x}_k^{(\ell)},
\qquad
\mathbf{V}_k^{(\ell)} = W_V^{(\ell)}\mathbf{x}_k^{(\ell)}.
```

`mask_{<=32}` zeros coordinates beyond the first 32. The manuscript says the
mask applies at slot-typed positions, reuses the pretrained key projection,
and introduces no OA-specific parameters. Non-slot positions use the
unmodified base attention.

## Per-layer reset and claim boundary (`neurips_2026.tex:344`)

After every transformer block, a hook applies
`x_k^(ell+1)[1:32] <- addr_k` at slot positions while leaving the remaining
4064 coordinates untouched. The manuscript says this prevents address drift
through residual updates. It also states that time-varying content still flows
through values and the residual stream.

The manuscript explicitly limits the architectural property: it is
conditional on correct slot extraction and cannot recover if the upstream
system misses an object or initializes ambiguous addresses.

## OA isolation (`neurips_2026.tex:513-529`, Table `abl-oa`)

The compared variants share the training pipeline, tokenization, slot adapter,
world/action heads, seeds and evaluation protocol. They differ in the key mask
and reset hook:

| Variant | K mask | Reset | LIBERO | LP camera | LP robot | LP avg | Swap binding |
|---|---:|---:|---:|---:|---:|---:|---:|
| V2, no OA | off | off | 95.4 | 60.5 | 64.8 | 76.2 | 0.06 |
| V1, mask off | off | on | 96.3 | 67.2 | 71.4 | 80.8 | 0.19 |
| V0, full | on | on | 97.8 | 80.5 | 89.6 | 83.9 | 0.87 |

## Address-swap intervention (`neurips_2026.tex:539-566`, Table
`abl-intervention`)

At test time, the target slot's address is swapped with another in-scene slot
while all other inputs are held fixed. The metric is cosine alignment between
the resulting end-effector residual trajectory and the displacement direction
toward the swapped target. Full OA-WAM reports `0.87`; the eight listed
holistic baselines are all at or below `0.09`; V1 reports `0.19`; a mean-pool
head with OA reports `0.18`.

## Sensor-noise boundary and arithmetic (`neurips_2026.tex:464-485`, Table
`libero-plus`; `508`, `573`)

Table 2 reports sensor-noise success of `75.6` for OA-WAM, `89.7` for pi-0.5,
and `92.7` for Cosmos-Policy. The delta row's `-17.1` is OA-WAM relative to the
prior best (`75.6 - 92.7`). Relative to pi-0.5 the difference is `-14.1`.

The manuscript attributes the sensor-noise deficit to frozen-tokenizer and
slot-extraction failures, and lists simulator-only validation as a limitation.
