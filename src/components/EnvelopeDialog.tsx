import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
} from '@mui/material';
import { type Envelope } from '../types/envelope';

interface EnvelopeDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Envelope, 'id'>, id?: string) => void;
  initialEnvelope?: Envelope;
}

interface FormState {
  name: string;
  baseAmount: string;
  targetAmount: string;
}

const emptyForm: FormState = {
  name: '',
  baseAmount: '',
  targetAmount: '',
};

interface FormErrors {
  name?: string;
  baseAmount?: string;
  targetAmount?: string;
}

export default function EnvelopeDialog({ open, onClose, onSave, initialEnvelope }: EnvelopeDialogProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});

  const isEditing = initialEnvelope != null;

  useEffect(() => {
    if (open) {
      setForm(
        initialEnvelope
          ? {
              name: initialEnvelope.name,
              baseAmount: String(initialEnvelope.baseAmount),
              targetAmount: String(initialEnvelope.targetAmount),
            }
          : emptyForm,
      );
      setErrors({});
    }
  }, [open, initialEnvelope]);

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!form.name.trim()) next.name = 'Nom requis.';

    const base = parseFloat(form.baseAmount);
    if (form.baseAmount === '' || isNaN(base) || base < 0)
      next.baseAmount = 'Montant de base invalide (≥ 0).';

    const target = parseFloat(form.targetAmount);
    if (form.targetAmount === '' || isNaN(target) || target <= 0)
      next.targetAmount = 'Objectif invalide (> 0).';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave(
      {
        name: form.name.trim(),
        baseAmount: parseFloat(form.baseAmount),
        targetAmount: parseFloat(form.targetAmount),
        allocationPercentage: initialEnvelope?.allocationPercentage ?? 0,
      },
      initialEnvelope?.id,
    );
    onClose();
  };

  const handleClose = () => {
    setForm(emptyForm);
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        {isEditing ? "Modifier l'enveloppe" : "Nouvelle enveloppe"}
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Nom"
            fullWidth
            value={form.name}
            onChange={set('name')}
            error={!!errors.name}
            helperText={errors.name || ' '}
          />
          <TextField
            label="Montant de base (€)"
            type="number"
            fullWidth
            value={form.baseAmount}
            onChange={set('baseAmount')}
            error={!!errors.baseAmount}
            helperText={errors.baseAmount || 'Solde actuel avant revenus'}
            inputProps={{ min: 0, step: 1 }}
          />
          <TextField
            label="Objectif (€)"
            type="number"
            fullWidth
            value={form.targetAmount}
            onChange={set('targetAmount')}
            error={!!errors.targetAmount}
            helperText={errors.targetAmount || ' '}
            inputProps={{ min: 1, step: 1 }}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Annuler
        </Button>
        <Button variant="contained" onClick={handleSave}>
          {isEditing ? 'Enregistrer' : 'Créer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
