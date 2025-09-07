import React, { useState } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
  background: var(--background-secondary);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h2`
  text-align: center;
  margin-bottom: 2rem;
  color: var(--text-primary);
  font-size: 2rem;
  font-weight: 600;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 500;
  color: var(--text-primary);
  font-size: 0.9rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
  background: var(--background-primary);
  color: var(--text-primary);
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: var(--accent-color);
  }

  &::placeholder {
    color: var(--text-secondary);
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
  background: var(--background-primary);
  color: var(--text-primary);
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: var(--accent-color);
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
  background: var(--background-primary);
  color: var(--text-primary);
  transition: border-color 0.2s ease;
  resize: vertical;
  min-height: 100px;

  &:focus {
    outline: none;
    border-color: var(--accent-color);
  }

  &::placeholder {
    color: var(--text-secondary);
  }
`;

const SubmitButton = styled.button`
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #34d399 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(52, 211, 153, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const SuccessMessage = styled.div`
  padding: 1rem;
  background: rgba(52, 211, 153, 0.1);
  border: 2px solid #34d399;
  border-radius: 8px;
  color: #059669;
  text-align: center;
  font-weight: 500;
  margin-top: 1rem;
`;

const ErrorMessage = styled.div`
  padding: 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 2px solid #ef4444;
  border-radius: 8px;
  color: #dc2626;
  text-align: center;
  font-weight: 500;
  margin-top: 1rem;
`;

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  accent-color: #34d399;
`;

const RegisterOnline: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    occupation: '',
    company: '',
    website: '',
    bio: '',
    interests: [] as string[],
    newsletter: false,
    terms: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    if (name === 'interests') {
      const interest = e.target.value;
      setFormData(prev => ({
        ...prev,
        interests: checked 
          ? [...prev.interests, interest]
          : prev.interests.filter(i => i !== interest)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Validate required fields
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.terms) {
        throw new Error('Please fill in all required fields and accept terms');
      }

      setSubmitStatus('success');
      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          dateOfBirth: '',
          gender: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
          occupation: '',
          company: '',
          website: '',
          bio: '',
          interests: [],
          newsletter: false,
          terms: false
        });
        setSubmitStatus('idle');
      }, 3000);
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const interestOptions = [
    'Technology', 'Art', 'Music', 'Sports', 'Travel', 'Food', 'Fashion', 'Gaming',
    'Education', 'Health', 'Finance', 'Environment', 'Politics', 'Science', 'Literature'
  ];

  return (
    <Container>
      <Title>Online Registration Form</Title>
      
      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            placeholder="Enter your first name"
            required
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            placeholder="Enter your last name"
            required
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="email">Email Address *</Label>
          <Input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Enter your email address"
            required
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="Enter your phone number"
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <Input
            type="date"
            id="dateOfBirth"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleInputChange}
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="gender">Gender</Label>
          <Select
            id="gender"
            name="gender"
            value={formData.gender}
            onChange={handleInputChange}
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer-not-to-say">Prefer not to say</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Label htmlFor="address">Address</Label>
          <TextArea
            id="address"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            placeholder="Enter your full address"
          />
        </FormGroup>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <FormGroup>
            <Label htmlFor="city">City</Label>
            <Input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              placeholder="City"
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="state">State/Province</Label>
            <Input
              type="text"
              id="state"
              name="state"
              value={formData.state}
              onChange={handleInputChange}
              placeholder="State/Province"
            />
          </FormGroup>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <FormGroup>
            <Label htmlFor="zipCode">ZIP/Postal Code</Label>
            <Input
              type="text"
              id="zipCode"
              name="zipCode"
              value={formData.zipCode}
              onChange={handleInputChange}
              placeholder="ZIP/Postal Code"
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="country">Country</Label>
            <Input
              type="text"
              id="country"
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              placeholder="Country"
            />
          </FormGroup>
        </div>

        <FormGroup>
          <Label htmlFor="occupation">Occupation</Label>
          <Input
            type="text"
            id="occupation"
            name="occupation"
            value={formData.occupation}
            onChange={handleInputChange}
            placeholder="Enter your occupation"
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="company">Company/Organization</Label>
          <Input
            type="text"
            id="company"
            name="company"
            value={formData.company}
            onChange={handleInputChange}
            placeholder="Enter your company or organization"
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="website">Website</Label>
          <Input
            type="url"
            id="website"
            name="website"
            value={formData.website}
            onChange={handleInputChange}
            placeholder="https://your-website.com"
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="bio">Bio/About Me</Label>
          <TextArea
            id="bio"
            name="bio"
            value={formData.bio}
            onChange={handleInputChange}
            placeholder="Tell us a bit about yourself..."
          />
        </FormGroup>

        <FormGroup>
          <Label>Interests</Label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem' }}>
            {interestOptions.map(interest => (
              <CheckboxGroup key={interest}>
                <Checkbox
                  type="checkbox"
                  id={`interest-${interest}`}
                  name="interests"
                  value={interest}
                  checked={formData.interests.includes(interest)}
                  onChange={handleCheckboxChange}
                />
                <Label htmlFor={`interest-${interest}`} style={{ fontSize: '0.85rem', margin: 0 }}>
                  {interest}
                </Label>
              </CheckboxGroup>
            ))}
          </div>
        </FormGroup>

        <CheckboxGroup>
          <Checkbox
            type="checkbox"
            id="newsletter"
            name="newsletter"
            checked={formData.newsletter}
            onChange={handleCheckboxChange}
          />
          <Label htmlFor="newsletter">Subscribe to our newsletter for updates and special offers</Label>
        </CheckboxGroup>

        <CheckboxGroup>
          <Checkbox
            type="checkbox"
            id="terms"
            name="terms"
            checked={formData.terms}
            onChange={handleCheckboxChange}
            required
          />
          <Label htmlFor="terms">I agree to the terms and conditions *</Label>
        </CheckboxGroup>

        <SubmitButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Registration'}
        </SubmitButton>

        {submitStatus === 'success' && (
          <SuccessMessage>
            Registration submitted successfully! Thank you for registering.
          </SuccessMessage>
        )}

        {submitStatus === 'error' && (
          <ErrorMessage>
            There was an error submitting your registration. Please try again.
          </ErrorMessage>
        )}
      </Form>
    </Container>
  );
};

export default RegisterOnline; 